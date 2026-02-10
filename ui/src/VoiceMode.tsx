import { useEffect, useRef, useState } from "react";
import {
  useVoiceSession,
  type VoiceState,
  type TranscriptEntry,
} from "./useVoiceSession";
import { Mic, MicOff, X, Loader2, AlertCircle, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  onClose: () => void;
};

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Disconnected",
  connecting: "Connecting...",
  listening: "Listening",
  speaking: "Speaking",
  processing: "Asking Village...",
  error: "Error",
};

// ---- Orb visual ----

function OrbVisual({ state }: { state: VoiceState }) {
  const base = "w-40 h-40 sm:w-48 sm:h-48";

  const styles: Record<VoiceState, string> = {
    idle: "bg-zinc-700/30 scale-90",
    connecting: "bg-zinc-600/40 scale-95 animate-pulse",
    listening:
      "bg-gradient-to-br from-emerald-500/50 to-teal-600/50 scale-100 shadow-[0_0_80px_rgba(16,185,129,0.3)]",
    speaking:
      "bg-gradient-to-br from-violet-500/50 to-indigo-600/50 scale-110 shadow-[0_0_100px_rgba(139,92,246,0.4)]",
    processing:
      "bg-gradient-to-br from-amber-500/40 to-orange-600/40 scale-100 shadow-[0_0_80px_rgba(245,158,11,0.3)]",
    error:
      "bg-gradient-to-br from-red-500/40 to-red-700/40 scale-95 shadow-[0_0_60px_rgba(239,68,68,0.3)]",
  };

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute ${base} rounded-full transition-all duration-700 ease-in-out blur-xl opacity-50 ${styles[state]}`}
      />
      <div
        className={`${base} rounded-full transition-all duration-500 ease-in-out ${styles[state]} backdrop-blur-sm border border-white/10`}
      />
      <div className="absolute">
        {state === "connecting" && <Loader2 className="size-10 text-white/60 animate-spin" />}
        {state === "listening" && <Mic className="size-10 text-white/80" />}
        {state === "speaking" && (
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-white/70 rounded-full animate-bounce"
                style={{
                  height: `${12 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.6s",
                }}
              />
            ))}
          </div>
        )}
        {state === "processing" && <Loader2 className="size-10 text-amber-300/80 animate-spin" />}
        {state === "idle" && <MicOff className="size-10 text-white/30" />}
        {state === "error" && <AlertCircle className="size-10 text-red-400/80" />}
      </div>
    </div>
  );
}

// ---- Transcript entry ----

const COLLAPSE_THRESHOLD = 150;

function TranscriptItem({ entry }: { entry: TranscriptEntry }) {
  const isLong = entry.type === "agent" && entry.text.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);

  if (entry.type === "status") {
    return <p className="text-zinc-500 italic text-xs">{entry.text}</p>;
  }

  if (entry.type === "tool") {
    return <p className="text-amber-400/80 text-xs">{entry.text}</p>;
  }

  if (entry.type === "user") {
    return <p className="text-emerald-400/80 text-xs">{entry.text}</p>;
  }

  // Agent response — render markdown, collapsible if long
  return (
    <div className="text-xs">
      {isLong && !expanded ? (
        <div>
          <p className="text-zinc-400">{entry.text.slice(0, COLLAPSE_THRESHOLD)}...</p>
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
          >
            <ChevronRight className="size-3" />
            <span>Show full response</span>
          </button>
        </div>
      ) : (
        <div>
          <div className="prose prose-xs prose-invert prose-zinc max-w-none text-zinc-400 [&_p]:my-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_li]:my-0.5">
            <Markdown remarkPlugins={[remarkGfm]}>{entry.text}</Markdown>
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
            >
              <ChevronDown className="size-3" />
              <span>Collapse</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Transcript log ----

function TranscriptLog({ entries }: { entries: TranscriptEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-lg mt-6 max-h-48 overflow-y-auto rounded-lg bg-zinc-900/80 border border-zinc-800 px-4 py-3 space-y-2">
      {entries.map((e, i) => (
        <TranscriptItem key={i} entry={e} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ---- Main component ----

export function VoiceMode({ onClose }: Props) {
  const { state, toolStatus, error, transcript, connect, disconnect } =
    useVoiceSession();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const handleToggle = () => {
    if (state === "idle" || state === "error") connect();
    else disconnect();
  };

  const handleClose = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm px-4">
      {/* Close */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Close voice mode"
      >
        <X className="size-6" />
      </button>

      {/* Title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <h2 className="text-lg font-semibold text-zinc-200">Voice Mode</h2>
        <p className="text-xs text-zinc-500 mt-1">{STATE_LABELS[state]}</p>
      </div>

      {/* Orb */}
      <OrbVisual state={state} />

      {/* Error */}
      {error && (
        <div className="mt-6 max-w-md px-4 py-3 rounded-lg bg-red-950/60 border border-red-800/50 text-center">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Tool status */}
      {toolStatus && !error && (
        <div className="mt-6 px-4 py-2 rounded-full bg-zinc-800/80 border border-zinc-700">
          <p className="text-sm text-zinc-300">{toolStatus}</p>
        </div>
      )}

      {/* Transcript */}
      <TranscriptLog entries={transcript} />

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6">
        <button
          onClick={handleToggle}
          className={`p-5 rounded-full transition-all duration-200 ${state === "idle" || state === "error"
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
            }`}
          title={state === "idle" || state === "error" ? "Start voice" : "Stop voice"}
        >
          {state === "idle" || state === "error" ? (
            state === "error" ? <RotateCcw className="size-7" /> : <Mic className="size-7" />
          ) : (
            <MicOff className="size-7" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="absolute bottom-8 text-xs text-zinc-600">
        {state === "idle"
          ? "Tap the microphone to start"
          : state === "error"
            ? "Tap to retry"
            : "Use headphones to prevent echo"}
      </p>
    </div>
  );
}
