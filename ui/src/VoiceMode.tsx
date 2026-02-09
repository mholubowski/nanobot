import { useEffect } from "react";
import { useVoiceSession, type VoiceState } from "./useVoiceSession";
import { Mic, MicOff, X, Loader2, AlertCircle, RotateCcw } from "lucide-react";

type Props = {
  onClose: () => void;
};

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Disconnected",
  connecting: "Connecting...",
  listening: "Listening",
  speaking: "Speaking",
  processing: "Running tool...",
  error: "Error",
};

function OrbVisual({ state }: { state: VoiceState }) {
  const baseSize = "w-48 h-48";

  const stateStyles: Record<VoiceState, string> = {
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
      {/* Outer glow ring */}
      <div
        className={`absolute ${baseSize} rounded-full transition-all duration-700 ease-in-out blur-xl opacity-50 ${stateStyles[state]}`}
      />
      {/* Inner orb */}
      <div
        className={`${baseSize} rounded-full transition-all duration-500 ease-in-out ${stateStyles[state]} backdrop-blur-sm border border-white/10`}
      />
      {/* Center icon */}
      <div className="absolute">
        {state === "connecting" && (
          <Loader2 className="size-10 text-white/60 animate-spin" />
        )}
        {state === "listening" && (
          <Mic className="size-10 text-white/80" />
        )}
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
        {state === "processing" && (
          <Loader2 className="size-10 text-amber-300/80 animate-spin" />
        )}
        {state === "idle" && (
          <MicOff className="size-10 text-white/30" />
        )}
        {state === "error" && (
          <AlertCircle className="size-10 text-red-400/80" />
        )}
      </div>
    </div>
  );
}

export function VoiceMode({ onClose }: Props) {
  const { state, toolStatus, error, connect, disconnect } = useVoiceSession();

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    if (state === "idle" || state === "error") {
      connect();
    } else {
      disconnect();
    }
  };

  const handleClose = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      {/* Close button */}
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
        <p className="text-xs text-zinc-500 mt-1">
          {STATE_LABELS[state]}
        </p>
      </div>

      {/* Orb */}
      <OrbVisual state={state} />

      {/* Error message */}
      {error && (
        <div className="mt-6 max-w-md px-4 py-3 rounded-lg bg-red-950/60 border border-red-800/50 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <p className="text-xs text-red-400/60 mt-1">Check browser console for details</p>
        </div>
      )}

      {/* Tool status */}
      {toolStatus && !error && (
        <div className="mt-8 px-4 py-2 rounded-full bg-zinc-800/80 border border-zinc-700">
          <p className="text-sm text-zinc-300">{toolStatus}</p>
        </div>
      )}

      {/* Controls */}
      <div className="mt-12 flex items-center gap-6">
        <button
          onClick={handleToggle}
          className={`p-5 rounded-full transition-all duration-200 ${
            state === "idle" || state === "error"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
              : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
          }`}
          title={
            state === "idle" || state === "error"
              ? "Start voice"
              : "Stop voice"
          }
        >
          {state === "idle" || state === "error" ? (
            state === "error" ? (
              <RotateCcw className="size-7" />
            ) : (
              <Mic className="size-7" />
            )
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
