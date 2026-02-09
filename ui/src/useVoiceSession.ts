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
 * Handles:
 * - Ephemeral token fetching from backend
 * - WebSocket connection to Gemini Live API
 * - Mic audio capture (16kHz 16-bit PCM mono)
 * - Audio playback (24kHz 16-bit PCM mono)
 * - Tool call forwarding to backend
 */
export function useVoiceSession() {
  const [state, setState] = useState<VoiceState>("idle");
  const [toolStatus, setToolStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const abortRef = useRef(false);
  const sessionAliveRef = useRef(false);

  // ---- Audio playback ----

  const playNextChunk = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const samples = playbackQueueRef.current.shift()!;

    // Convert Int16 to Float32
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
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const int16 = new Int16Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength / 2,
        );
        playbackQueueRef.current.push(int16);

        if (!isPlayingRef.current) {
          playNextChunk();
        }
      } catch (err) {
        console.error("[Voice] Error decoding audio:", err);
      }
    },
    [playNextChunk],
  );

  // ---- Tool call handling ----

  const handleToolCall = useCallback(
    async (msg: LiveServerMessage) => {
      const functionCalls = msg.toolCall?.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        console.warn("[Voice] toolCall received but no functionCalls:", msg.toolCall);
        return;
      }
      if (!sessionRef.current) {
        console.warn("[Voice] toolCall received but session is null");
        return;
      }

      console.log("[Voice] Tool call received:", functionCalls.map(fc => fc.name));
      setState("processing");

      const responses: { id: string; name: string; response: Record<string, unknown> }[] = [];

      for (const fc of functionCalls) {
        const name = fc.name ?? "unknown";
        const id = fc.id ?? "";
        console.log(`[Voice] Executing tool: ${name}`, fc.args);
        setToolStatus(`Running ${name}...`);

        try {
          const res = await fetch("/api/voice/tool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, args: fc.args ?? {} }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`[Voice] Tool API error (${res.status}):`, errText);
            responses.push({
              id,
              name,
              response: { result: `Error: HTTP ${res.status} - ${errText}` },
            });
            continue;
          }

          const data = await res.json();
          console.log(`[Voice] Tool result for ${name}:`, (data.result ?? "").slice(0, 200));
          responses.push({
            id,
            name,
            response: { result: data.result ?? "No result" },
          });
        } catch (err) {
          console.error(`[Voice] Tool fetch error for ${name}:`, err);
          responses.push({
            id,
            name,
            response: { result: `Error: ${err}` },
          });
        }
      }

      setToolStatus("");

      // Send all tool responses back to Gemini
      try {
        console.log("[Voice] Sending tool responses:", responses.map(r => r.name));
        sessionRef.current.sendToolResponse({
          functionResponses: responses,
        });
        setState("listening");
      } catch (err) {
        console.error("[Voice] sendToolResponse error:", err);
        setError(`Tool response failed: ${err}`);
        setState("error");
      }
    },
    [],
  );

  // ---- Message handler ----

  const handleMessage = useCallback(
    (msg: LiveServerMessage) => {
      try {
        // Raw message log — summarize each message type
        const msgKeys = Object.keys(msg).filter(k => (msg as any)[k] != null);
        const summary: Record<string, unknown> = { keys: msgKeys };
        if (msg.serverContent?.modelTurn?.parts) {
          summary.parts = msg.serverContent.modelTurn.parts.map((p: any) => {
            if (p.inlineData) return `audio(${(p.inlineData.data as string)?.length ?? 0} chars)`;
            if (p.functionCall) return `functionCall(${p.functionCall.name})`;
            if (p.text) return `text(${p.text.slice(0, 50)})`;
            return Object.keys(p).join(",");
          });
        }
        if (msg.serverContent?.turnComplete) summary.turnComplete = true;
        if (msg.toolCall?.functionCalls) {
          summary.toolCall = msg.toolCall.functionCalls.map((fc: any) => fc.name);
        }
        if (msg.toolCallCancellation) summary.cancelled = msg.toolCallCancellation.ids;
        console.log("[Voice] MSG:", JSON.stringify(summary));

        // Setup complete
        if (msg.setupComplete) {
          console.log("[Voice] Setup complete");
          return;
        }

        // Tool calls
        if (msg.toolCall) {
          // Fire and forget — errors handled inside handleToolCall
          handleToolCall(msg).catch((err) => {
            console.error("[Voice] Unhandled tool call error:", err);
            setError(`Tool call failed: ${err}`);
            setState("error");
          });
          return;
        }

        // Tool call cancellation
        if (msg.toolCallCancellation) {
          console.log("[Voice] Tool call cancelled:", msg.toolCallCancellation.ids);
          setToolStatus("");
          setState("listening");
          return;
        }

        // Interruption — clear playback queue
        if (
          msg.serverContent &&
          "interrupted" in msg.serverContent &&
          (msg.serverContent as any).interrupted
        ) {
          console.log("[Voice] Interrupted — clearing playback");
          playbackQueueRef.current.length = 0;
          isPlayingRef.current = false;
          return;
        }

        // Audio data from model
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (
              part.inlineData &&
              typeof part.inlineData.data === "string"
            ) {
              setState("speaking");
              enqueueAudio(part.inlineData.data);
            }
          }
        }

        // Turn complete — back to listening
        if (msg.serverContent?.turnComplete) {
          setState("listening");
        }
      } catch (err) {
        console.error("[Voice] Error in message handler:", err);
      }
    },
    [handleToolCall, enqueueAudio],
  );

  // ---- Connect ----

  const connect = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;

    setState("connecting");
    setError("");
    abortRef.current = false;

    try {
      // 1. Get token + config from backend
      console.log("[Voice] Fetching voice token...");
      const configRes = await fetch("/api/voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools: true }),
      });
      if (!configRes.ok) {
        const errText = await configRes.text();
        throw new Error(`Failed to get voice token: ${configRes.status} ${errText}`);
      }
      const config: VoiceConfig = await configRes.json();
      const declCount = (config.tools ?? []).reduce(
        (n: number, t: any) => n + (t.functionDeclarations?.length ?? 0),
        0,
      );
      console.log("[Voice] Got config:", {
        model: config.model,
        tokenType: config.tokenType,
        toolDeclCount: declCount,
        promptLength: config.systemInstruction?.length ?? 0,
      });

      if (abortRef.current) return;

      // 2. Create Gemini client with the token
      const ai = new GoogleGenAI({ apiKey: config.token });

      // 3. Connect to Live API
      // Try with tools first; if connection dies quickly, retry without tools
      const connectToGemini = async (
        useTools: boolean,
      ): Promise<Session> => {
        const toolsConfig = useTools && config.tools?.length
          ? config.tools
          : undefined;

        console.log(
          `[Voice] Connecting to Gemini Live API (tools=${useTools ? "yes" : "no"})...`,
        );

        sessionAliveRef.current = false;
        let closeReason = "";

        const session = await ai.live.connect({
          model: config.model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: config.systemInstruction,
            ...(toolsConfig ? { tools: toolsConfig as any } : {}),
          },
          callbacks: {
            onopen: () => {
              console.log("[Voice] WebSocket connected");
              sessionAliveRef.current = true;
            },
            onmessage: handleMessage,
            onerror: (e: ErrorEvent) => {
              console.error("[Voice] WebSocket error:", e);
              sessionAliveRef.current = false;
              closeReason = e.message || "unknown error";
            },
            onclose: (e: CloseEvent) => {
              console.log("[Voice] WebSocket closed:", e.code, e.reason);
              const wasAlive = sessionAliveRef.current;
              sessionAliveRef.current = false;
              closeReason = e.reason || "";
              // If session was established and running, update UI
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

        // Wait to check if Gemini rejects the session immediately
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!sessionAliveRef.current) {
          throw new Error(closeReason || "Session closed immediately");
        }

        return session;
      };

      let session: Session;
      try {
        session = await connectToGemini(true);
        console.log("[Voice] Connected with tools");
      } catch (err) {
        console.warn(
          `[Voice] Connection with tools failed: ${err}. Retrying without tools...`,
        );
        setToolStatus("Tools unavailable — connecting without tools...");
        try {
          session = await connectToGemini(false);
          console.log("[Voice] Connected without tools (voice-only mode)");
          setToolStatus("Voice-only mode (tools not supported with this model)");
          // Clear the status after a few seconds
          setTimeout(() => setToolStatus(""), 5000);
        } catch (err2) {
          throw new Error(`Connection failed: ${err2}`);
        }
      }

      if (abortRef.current) {
        session.close();
        return;
      }

      sessionRef.current = session;
      console.log("[Voice] Session established and alive");

      // 4. Set up audio contexts
      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = playbackCtx;

      // 5. Get mic access
      console.log("[Voice] Requesting mic access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      console.log("[Voice] Mic access granted");

      if (abortRef.current || !sessionAliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        if (!abortRef.current) {
          console.error("[Voice] Session died while waiting for mic permission");
        }
        return;
      }

      // 6. Set up audio capture at 16kHz
      const micCtx = new AudioContext({ sampleRate: 16000 });
      micContextRef.current = micCtx;
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        // Check session is alive before sending
        if (!sessionAliveRef.current || !sessionRef.current || abortRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            } as any,
          });
        } catch {
          // Session may have closed — stop sending
          sessionAliveRef.current = false;
        }
      };

      source.connect(processor);
      processor.connect(micCtx.destination);
      processorRef.current = processor;

      console.log("[Voice] Audio pipeline ready — listening");
      setState("listening");
    } catch (err) {
      console.error("[Voice] Connect error:", err);
      setError(`Failed to connect: ${err}`);
      setState("error");
    }
  }, [state, handleMessage]);

  // ---- Disconnect ----

  const disconnect = useCallback(() => {
    abortRef.current = true;
    sessionAliveRef.current = false;

    // Stop mic
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close mic audio context
    if (micContextRef.current) {
      micContextRef.current.close();
      micContextRef.current = null;
    }

    // Close playback audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close Gemini session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (err) {
        console.warn("[Voice] Error closing session:", err);
      }
      sessionRef.current = null;
    }

    // Clear playback queue
    playbackQueueRef.current.length = 0;
    isPlayingRef.current = false;

    setToolStatus("");
    setError("");
    setState("idle");
  }, []);

  return {
    state,
    toolStatus,
    error,
    connect,
    disconnect,
  };
}
