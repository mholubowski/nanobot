import { useRef, useState, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { Session, LiveServerMessage } from "@google/genai";

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

/**
 * Custom hook that manages a Gemini Live API voice session.
 *
 * The voice model is a thin conversational layer — all real work is
 * delegated to Nanobot via the single `ask_nanobot` tool.
 */
export function useVoiceSession() {
  const [state, setState] = useState<VoiceState>("idle");
  const [toolStatus, setToolStatus] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const sessionRef = useRef<Session | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const aliveRef = useRef(false);
  const abortRef = useRef(false);
  const cancelledToolIdsRef = useRef<Set<string>>(new Set());
  const toolAbortRef = useRef<AbortController | null>(null);

  // ---- Helpers ----

  const addTranscript = useCallback(
    (type: TranscriptEntry["type"], text: string) => {
      setTranscript((prev) => [
        ...prev,
        { type, text, timestamp: Date.now() },
      ]);
    },
    [],
  );

  // ---- Audio playback (24kHz output) ----

  const playNextChunk = useCallback(() => {
    const ctx = playbackCtxRef.current;
    if (!ctx || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const samples = playbackQueueRef.current.shift()!;
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      float32[i] = samples[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => playNextChunk();
    source.start();
  }, []);

  const enqueueAudio = useCallback(
    (base64Data: string) => {
      try {
        const bin = atob(base64Data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
        playbackQueueRef.current.push(int16);
        if (!isPlayingRef.current) playNextChunk();
      } catch {
        // skip malformed audio
      }
    },
    [playNextChunk],
  );

  // ---- Tool call handling ----

  const executeTool = useCallback(
    async (id: string, name: string, args: Record<string, unknown>) => {
      if (!sessionRef.current || !aliveRef.current) return;

      console.log(`[Voice] Tool call: ${name}`, args);
      setState("processing");
      setToolStatus(`Asking Nanobot...`);
      addTranscript("tool", `Asking: ${(args.question as string) ?? name}`);

      const abortController = new AbortController();
      toolAbortRef.current = abortController;

      let resultText = "No result";

      try {
        const res = await fetch("/api/voice/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, args }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          resultText = `Error: HTTP ${res.status}`;
        } else {
          const data = await res.json();
          resultText = data.result ?? "No result";
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          console.log(`[Voice] Tool call ${id} was aborted`);
          return; // Don't send response for aborted calls
        }
        resultText = `Error: ${err}`;
      } finally {
        toolAbortRef.current = null;
      }

      // Check if this tool call was cancelled while we were running
      if (cancelledToolIdsRef.current.has(id)) {
        console.log(`[Voice] Tool call ${id} was cancelled, skipping response`);
        cancelledToolIdsRef.current.delete(id);
        return;
      }

      setToolStatus("");
      console.log(`[Voice] Tool result (${resultText.length} chars):`, resultText.slice(0, 200));
      addTranscript("agent", resultText);

      // Send result back to Gemini
      try {
        sessionRef.current.sendToolResponse({
          functionResponses: [{ id, name, response: { result: resultText } }],
        });
        setState("listening");
      } catch (err) {
        console.error("[Voice] sendToolResponse error:", err);
        setError(`Tool response failed: ${err}`);
        setState("error");
      }
    },
    [addTranscript],
  );

  // ---- Message handler ----

  const handleMessage = useCallback(
    (msg: LiveServerMessage) => {
      try {
        // Setup complete
        if (msg.setupComplete) {
          console.log("[Voice] Setup complete");
          return;
        }

        // Top-level tool call
        if (msg.toolCall?.functionCalls) {
          for (const fc of msg.toolCall.functionCalls) {
            executeTool(fc.id ?? "", fc.name ?? "unknown", fc.args ?? {}).catch(
              (err) => {
                console.error("[Voice] Tool call error:", err);
                setError(`Tool call failed: ${err}`);
                setState("error");
              },
            );
          }
          return;
        }

        // Tool call cancellation
        if (msg.toolCallCancellation?.ids) {
          console.log("[Voice] Tool calls cancelled:", msg.toolCallCancellation.ids);
          for (const id of msg.toolCallCancellation.ids) {
            cancelledToolIdsRef.current.add(id);
          }
          // Abort the in-flight fetch if any
          if (toolAbortRef.current) {
            toolAbortRef.current.abort();
            toolAbortRef.current = null;
          }
          setToolStatus("");
          setState("listening");
          return;
        }

        // Interruption — clear playback queue
        if (msg.serverContent && "interrupted" in msg.serverContent && (msg.serverContent as any).interrupted) {
          playbackQueueRef.current.length = 0;
          isPlayingRef.current = false;
          return;
        }

        // Server content (audio + possible embedded function calls)
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            // Audio data
            if (part.inlineData && typeof part.inlineData.data === "string") {
              setState("speaking");
              enqueueAudio(part.inlineData.data);
            }

            // Embedded function call (when model speaks then calls a tool in same turn)
            if ((part as any).functionCall) {
              const fc = (part as any).functionCall;
              executeTool(fc.id ?? "", fc.name ?? "unknown", fc.args ?? {}).catch(
                (err) => {
                  console.error("[Voice] Embedded tool call error:", err);
                  setError(`Tool call failed: ${err}`);
                  setState("error");
                },
              );
            }
          }
        }

        // Turn complete
        if (msg.serverContent?.turnComplete) {
          setState((prev) => (prev === "processing" ? prev : "listening"));
        }
      } catch (err) {
        console.error("[Voice] Message handler error:", err);
      }
    },
    [executeTool, enqueueAudio],
  );

  // ---- Connect ----

  const connect = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;

    setState("connecting");
    setError("");
    setTranscript([]);
    abortRef.current = false;
    cancelledToolIdsRef.current.clear();

    try {
      // 1. Get config from backend
      console.log("[Voice] Fetching voice config...");
      const res = await fetch("/api/voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const config: VoiceConfig = await res.json();
      console.log("[Voice] Config:", { model: config.model, tokenType: config.tokenType });

      if (abortRef.current) return;

      // 2. Connect to Gemini Live API
      const ai = new GoogleGenAI({ apiKey: config.token });
      aliveRef.current = false;

      console.log("[Voice] Connecting to Gemini...");
      const session = await ai.live.connect({
        model: config.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: config.systemInstruction,
          tools: config.tools as any,
        },
        callbacks: {
          onopen: () => {
            console.log("[Voice] WebSocket connected");
            aliveRef.current = true;
          },
          onmessage: handleMessage,
          onerror: (e: ErrorEvent) => {
            console.error("[Voice] WebSocket error:", e);
            aliveRef.current = false;
          },
          onclose: (e: CloseEvent) => {
            console.log("[Voice] WebSocket closed:", e.code, e.reason);
            const wasAlive = aliveRef.current;
            aliveRef.current = false;
            if (wasAlive && sessionRef.current) {
              if (e.reason) {
                setError(`Disconnected: ${e.reason}`);
                setState("error");
              } else {
                setState("idle");
              }
            }
          },
        },
      });

      // Check if Gemini accepted the session
      await new Promise((r) => setTimeout(r, 800));
      if (!aliveRef.current) {
        throw new Error("Session rejected by Gemini — check model/tools config");
      }

      if (abortRef.current) {
        session.close();
        return;
      }

      sessionRef.current = session;
      console.log("[Voice] Session alive");

      // 3. Audio contexts
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });

      // 4. Mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;

      if (abortRef.current || !aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 5. Mic capture at 16kHz → send to Gemini
      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!aliveRef.current || !sessionRef.current || abortRef.current) return;

        const input = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const bytes = new Uint8Array(int16.buffer);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);

        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" } as any,
          });
        } catch {
          aliveRef.current = false;
        }
      };

      source.connect(processor);
      processor.connect(micCtx.destination);
      processorRef.current = processor;

      console.log("[Voice] Ready — listening");
      addTranscript("status", "Connected — listening");
      setState("listening");
    } catch (err) {
      console.error("[Voice] Connect error:", err);
      setError(`Failed to connect: ${err}`);
      setState("error");
    }
  }, [state, handleMessage, addTranscript]);

  // ---- Disconnect ----

  const disconnect = useCallback(() => {
    abortRef.current = true;
    aliveRef.current = false;

    if (toolAbortRef.current) {
      toolAbortRef.current.abort();
      toolAbortRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micCtxRef.current) {
      micCtxRef.current.close();
      micCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* ok */ }
      sessionRef.current = null;
    }

    playbackQueueRef.current.length = 0;
    isPlayingRef.current = false;
    cancelledToolIdsRef.current.clear();
    setToolStatus("");
    setError("");
    setState("idle");
  }, []);

  return { state, toolStatus, error, transcript, connect, disconnect };
}
