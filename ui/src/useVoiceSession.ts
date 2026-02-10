import { useRef, useState, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { Session, LiveServerMessage } from "@google/genai";

// ── Types ────────────────────────────────────────────────────────────────────

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "processing"
  | "error";

export type TranscriptEntry = {
  type: "user" | "agent" | "tool" | "status";
  text: string;
  timestamp: number;
};

type VoiceConfig = {
  token: string;
  tokenType: "apiKey" | "ephemeral";
  model: string;
  systemInstruction: string;
  tools: unknown[];
};

/** Gemini SDK doesn't export a type for embedded function calls in parts */
type FunctionCallPart = {
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
};

// ── Constants ────────────────────────────────────────────────────────────────

/** Gemini outputs audio at 24 kHz */
const PLAYBACK_RATE = 24_000;

/** Gemini expects mic input at 16 kHz */
const MIC_RATE = 16_000;

/** Accumulate ~100 ms of audio before scheduling a Web Audio buffer */
const MIN_BUFFER_SAMPLES = 2_400;

/** ScriptProcessor frame size for mic capture (4096 samples ≈ 256 ms at 16 kHz) */
const MIC_FRAME_SIZE = 4096;

// ── PCM helpers ──────────────────────────────────────────────────────────────

/** Decode base64-encoded PCM into an Int16Array */
function decodePCM(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

/** Encode Uint8Array to base64 (chunked to stay within call-stack limits) */
function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(i, i + 8192);
    parts.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(parts.join(""));
}

/** Float32 → Int16 PCM conversion (clamps to [-1, 1]) */
function float32ToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages a Gemini Live API voice session.
 *
 * Audio pipeline:
 *   Mic (16 kHz PCM) → WebSocket → Gemini → WebSocket → Playback (24 kHz PCM)
 *
 * Playback uses direct Web Audio timeline scheduling — each buffer is placed
 * at the exact timestamp after the previous one. No `onended` chaining, so
 * main-thread jank can't create gaps between buffers.
 *
 * Tool calls are delegated to the Nanobot backend via POST /api/voice/tool.
 */
export function useVoiceSession() {
  // ── React state (drives UI) ──
  const [state, setState] = useState<VoiceState>("idle");
  const [toolStatus, setToolStatus] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // ── Refs (hot-path; avoids re-renders) ──

  // Session & lifecycle
  const sessionRef = useRef<Session | null>(null);
  const aliveRef = useRef(false);
  const abortRef = useRef(false);
  const stateRef = useRef<VoiceState>("idle");

  // Playback
  const playCtxRef = useRef<AudioContext | null>(null);
  const pendingRef = useRef<Int16Array[]>([]);
  const pendingCountRef = useRef(0);
  const nextPlayRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  // Mic
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Tool calls
  const cancelledIdsRef = useRef(new Set<string>());
  const toolAbortRef = useRef<AbortController | null>(null);

  // ── State helper (deduplicates renders + keeps ref in sync) ──

  const setVoiceState = useCallback((next: VoiceState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const addTranscript = useCallback(
    (type: TranscriptEntry["type"], text: string) =>
      setTranscript((prev) => [...prev, { type, text, timestamp: Date.now() }]),
    [],
  );

  // ── Playback: direct Web Audio timeline scheduling ─────────────────────────
  //
  // Instead of chaining buffers via onended callbacks (which depend on the main
  // thread dispatching the event promptly), we schedule each buffer at the exact
  // timestamp following the previous one. The Web Audio scheduler runs on a
  // high-priority audio thread, so gapless playback is immune to JS jank.

  /** Schedule one Int16 PCM buffer directly into the Web Audio timeline. */
  const scheduleBuffer = useCallback((samples: Int16Array) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;

    // Int16 → Float32 for Web Audio
    const f32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) f32[i] = samples[i] / 32768;

    // Web Audio resamples from PLAYBACK_RATE to the system's native rate
    const buf = ctx.createBuffer(1, f32.length, PLAYBACK_RATE);
    buf.copyToChannel(f32, 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    // Place right after the previous buffer for gapless playback
    const start = Math.max(ctx.currentTime, nextPlayRef.current);
    src.start(start);
    nextPlayRef.current = start + buf.duration;

    // Track so we can stop on interruption
    sourcesRef.current.add(src);
    src.onended = () => sourcesRef.current.delete(src);
  }, []);

  /** Concatenate accumulated pending chunks and schedule them. */
  const flushPending = useCallback(() => {
    const total = pendingCountRef.current;
    if (total === 0) return;

    const combined = new Int16Array(total);
    let off = 0;
    for (const chunk of pendingRef.current) {
      combined.set(chunk, off);
      off += chunk.length;
    }
    pendingRef.current = [];
    pendingCountRef.current = 0;

    scheduleBuffer(combined);
  }, [scheduleBuffer]);

  /** Decode incoming base64 audio, accumulate, and flush when large enough. */
  const enqueueAudio = useCallback(
    (b64: string) => {
      try {
        const pcm = decodePCM(b64);
        pendingRef.current.push(pcm);
        pendingCountRef.current += pcm.length;
        if (pendingCountRef.current >= MIN_BUFFER_SAMPLES) flushPending();
      } catch {
        /* skip malformed audio */
      }
    },
    [flushPending],
  );

  /** Immediately stop all playback and clear buffers (for interruptions). */
  const stopPlayback = useCallback(() => {
    for (const src of sourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already ended */
      }
    }
    sourcesRef.current.clear();
    pendingRef.current = [];
    pendingCountRef.current = 0;
    nextPlayRef.current = 0;
  }, []);

  // ── Tool call handling ─────────────────────────────────────────────────────

  const executeTool = useCallback(
    async (id: string, name: string, args: Record<string, unknown>) => {
      if (!sessionRef.current || !aliveRef.current) return;

      console.log(`[voice] tool: ${name}`, args);
      setVoiceState("processing");
      setToolStatus("Asking Village…");
      addTranscript("tool", `Asking Village: ${(args.question as string) ?? name}`);

      const ctrl = new AbortController();
      toolAbortRef.current = ctrl;

      let result = "No result";
      try {
        const res = await fetch("/api/voice/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, args }),
          signal: ctrl.signal,
        });
        result = res.ok
          ? ((await res.json()).result ?? "No result")
          : `Error: HTTP ${res.status}`;
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return; // aborted — don't respond
        result = `Error: ${err}`;
      } finally {
        toolAbortRef.current = null;
      }

      // Cancelled while the fetch was in-flight
      if (cancelledIdsRef.current.has(id)) {
        cancelledIdsRef.current.delete(id);
        return;
      }

      setToolStatus("");
      console.log(`[voice] result (${result.length} chars):`, result.slice(0, 200));
      addTranscript("agent", result);

      try {
        sessionRef.current.sendToolResponse({
          functionResponses: [{ id, name, response: { result } }],
        });
        setVoiceState("listening");
      } catch (err) {
        console.error("[voice] sendToolResponse failed:", err);
        setError(`Tool response failed: ${err}`);
        setVoiceState("error");
      }
    },
    [setVoiceState, addTranscript],
  );

  // ── WebSocket message handler ──────────────────────────────────────────────

  const handleMessage = useCallback(
    (msg: LiveServerMessage) => {
      try {
        if (msg.setupComplete) return;

        // Tool call request
        if (msg.toolCall?.functionCalls) {
          for (const fc of msg.toolCall.functionCalls) {
            executeTool(fc.id ?? "", fc.name ?? "unknown", fc.args ?? {}).catch(
              (err) => {
                console.error("[voice] tool error:", err);
                setError(`Tool call failed: ${err}`);
                setVoiceState("error");
              },
            );
          }
          return;
        }

        // Tool call cancellation
        if (msg.toolCallCancellation?.ids) {
          for (const id of msg.toolCallCancellation.ids)
            cancelledIdsRef.current.add(id);
          toolAbortRef.current?.abort();
          toolAbortRef.current = null;
          setToolStatus("");
          setVoiceState("listening");
          return;
        }

        // Interruption — stop all audio immediately
        const content = msg.serverContent as
          | (Record<string, unknown> & typeof msg.serverContent)
          | undefined;
        if (content?.interrupted) {
          stopPlayback();
          return;
        }

        // Model turn (audio chunks + possible embedded tool calls)
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            // Audio data
            if (part.inlineData?.data) {
              setVoiceState("speaking");
              enqueueAudio(part.inlineData.data as string);
            }

            // Embedded function call (model speaks then calls a tool in same turn)
            const fc = (part as FunctionCallPart).functionCall;
            if (fc) {
              executeTool(
                fc.id ?? "",
                fc.name ?? "unknown",
                fc.args ?? {},
              ).catch((err) => {
                console.error("[voice] embedded tool error:", err);
                setError(`Tool call failed: ${err}`);
                setVoiceState("error");
              });
            }
          }
        }

        // Turn complete — flush any remaining buffered audio
        if (msg.serverContent?.turnComplete) {
          flushPending();
          if (stateRef.current !== "processing") setVoiceState("listening");
        }
      } catch (err) {
        console.error("[voice] message handler error:", err);
      }
    },
    [executeTool, enqueueAudio, flushPending, stopPlayback, setVoiceState],
  );

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (stateRef.current !== "idle" && stateRef.current !== "error") return;

    setVoiceState("connecting");
    setError("");
    setTranscript([]);
    abortRef.current = false;
    cancelledIdsRef.current.clear();

    try {
      // 1. Fetch session config from backend
      const res = await fetch("/api/voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const cfg: VoiceConfig = await res.json();

      if (abortRef.current) return;

      // 2. Open Gemini Live WebSocket
      const ai = new GoogleGenAI({ apiKey: cfg.token });
      aliveRef.current = false;

      const session = await ai.live.connect({
        model: cfg.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: cfg.systemInstruction,
          tools: cfg.tools as any, // Gemini SDK tool type boundary
        },
        callbacks: {
          onopen: () => {
            console.log("[voice] ws connected");
            aliveRef.current = true;
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error("[voice] ws error:", e.message);
            aliveRef.current = false;
          },
          onclose: (e: CloseEvent) => {
            console.log("[voice] ws closed:", e.code, e.reason);
            const wasAlive = aliveRef.current;
            aliveRef.current = false;
            if (wasAlive && sessionRef.current) {
              if (e.reason) {
                setError(`Disconnected: ${e.reason}`);
                setVoiceState("error");
              } else {
                setVoiceState("idle");
              }
            }
          },
        },
      });

      // Brief wait for Gemini to accept the session
      await new Promise((r) => setTimeout(r, 800));
      if (!aliveRef.current) {
        throw new Error("Session rejected — check model/tools config");
      }

      if (abortRef.current) {
        session.close();
        return;
      }

      sessionRef.current = session;

      // 3. Playback context (system sample rate; Web Audio resamples from 24 kHz)
      playCtxRef.current = new AudioContext();

      // 4. Mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      if (abortRef.current || !aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 5. Mic capture → 16 kHz PCM → Gemini
      //    NOTE: ScriptProcessorNode is deprecated but universally supported.
      //    Could be migrated to AudioWorkletNode for off-main-thread processing.
      const micCtx = new AudioContext({ sampleRate: MIC_RATE });
      micCtxRef.current = micCtx;
      const src = micCtx.createMediaStreamSource(stream);
      const proc = micCtx.createScriptProcessor(MIC_FRAME_SIZE, 1, 1);

      proc.onaudioprocess = (e) => {
        if (!aliveRef.current || !sessionRef.current || abortRef.current) return;

        const pcm = float32ToInt16(e.inputBuffer.getChannelData(0));
        const b64 = toBase64(new Uint8Array(pcm.buffer));
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: b64, mimeType: "audio/pcm;rate=16000" } as any,
          });
        } catch {
          aliveRef.current = false;
        }
      };

      src.connect(proc);
      proc.connect(micCtx.destination);
      processorRef.current = proc;

      addTranscript("status", "Connected — listening");
      setVoiceState("listening");
    } catch (err) {
      console.error("[voice] connect error:", err);
      setError(`Failed to connect: ${err}`);
      setVoiceState("error");
    }
  }, [handleMessage, addTranscript, setVoiceState]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    abortRef.current = true;
    aliveRef.current = false;

    // Abort in-flight tool call
    toolAbortRef.current?.abort();
    toolAbortRef.current = null;

    // Tear down mic
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    micCtxRef.current?.close();
    micCtxRef.current = null;

    // Tear down playback
    stopPlayback();
    playCtxRef.current?.close();
    playCtxRef.current = null;

    // Close WebSocket
    try {
      sessionRef.current?.close();
    } catch {
      /* ok */
    }
    sessionRef.current = null;

    cancelledIdsRef.current.clear();
    setToolStatus("");
    setError("");
    setVoiceState("idle");
  }, [stopPlayback, setVoiceState]);

  return { state, toolStatus, error, transcript, connect, disconnect };
}
