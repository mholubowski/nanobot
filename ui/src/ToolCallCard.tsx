import { useState } from "react";
import { type ToolCall } from "./App";
import {
  Terminal,
  FileText,
  FolderOpen,
  Pencil,
  Search,
  FileSearch,
  Globe,
  Send,
  Clock,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";
import { VillageLogo } from "./VillageLogo";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  exec: <Terminal className="size-3.5" />,
  read_file: <FileText className="size-3.5" />,
  write_file: <Pencil className="size-3.5" />,
  edit_file: <Pencil className="size-3.5" />,
  list_dir: <FolderOpen className="size-3.5" />,
  search: <Search className="size-3.5" />,
  find_files: <FileSearch className="size-3.5" />,
  web_search: <Search className="size-3.5" />,
  web_fetch: <Globe className="size-3.5" />,
  message: <Send className="size-3.5" />,
  cron: <Clock className="size-3.5" />,
  village_api: <VillageLogo className="size-3.5 text-village" />,
  spawn: <Database className="size-3.5" />,
};

function getSummary(name: string, args: Record<string, unknown>): string {
  const str = (key: string) => (typeof args[key] === "string" ? (args[key] as string) : "");

  switch (name) {
    case "exec":
      return str("command").slice(0, 120);
    case "read_file":
    case "write_file":
    case "edit_file":
    case "list_dir":
      return str("path");
    case "search":
    case "find_files":
      return str("pattern");
    case "web_search":
      return str("query");
    case "web_fetch":
      return str("url");
    case "village_api":
      return `${str("method")} ${str("path")}`;
    default: {
      const first = Object.values(args).find((v) => typeof v === "string");
      return typeof first === "string" ? first.slice(0, 80) : "";
    }
  }
}

/** Keys already shown in the summary line — hide from expanded args. */
function getSummaryKeys(name: string): string[] {
  switch (name) {
    case "exec":
      return ["command"];
    case "read_file":
    case "write_file":
    case "edit_file":
    case "list_dir":
      return ["path"];
    case "search":
    case "find_files":
      return ["pattern"];
    case "web_search":
      return ["query"];
    case "web_fetch":
      return ["url"];
    case "village_api":
      return ["method", "path"];
    default:
      return [];
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [argsExpanded, setArgsExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);
  const icon = TOOL_ICONS[toolCall.name] ?? <Terminal className="size-3.5" />;
  const summary = getSummary(toolCall.name, toolCall.args);

  const summaryKeys = new Set(getSummaryKeys(toolCall.name));
  const extraArgs = Object.entries(toolCall.args).filter(
    ([k]) => !summaryKeys.has(k),
  );
  const hasExtraArgs = extraArgs.length > 0;

  const resultStr = toolCall.result ?? "";
  const isLongResult = resultStr.length > 600;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 text-zinc-300">
        {icon}
        <span className="font-mono text-xs font-medium">{toolCall.name}</span>
        {!toolCall.done ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
            <Loader2 className="size-3 animate-spin" />
            running
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-village">
            <Check className="size-3" />
            done
          </span>
        )}
      </div>

      {/* Summary line */}
      {summary && (
        <div className="px-3 pb-2 font-mono text-xs text-zinc-400 truncate">
          {summary}
        </div>
      )}

      {/* Expandable input args (only extra args not shown in summary) */}
      {hasExtraArgs && (
        <div className="border-t border-zinc-700">
          <button
            onClick={() => setArgsExpanded(!argsExpanded)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-700/50 transition-colors text-left"
          >
            {argsExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Input
            <span className="text-zinc-600 ml-1">
              ({extraArgs.length} {extraArgs.length === 1 ? "param" : "params"})
            </span>
          </button>
          {argsExpanded && (
            <div className="px-3 pb-2 space-y-1.5">
              {extraArgs.map(([key, value]) => (
                <div key={key}>
                  <span className="font-mono text-[11px] text-village/70">{key}: </span>
                  <pre className="inline font-mono text-[11px] text-zinc-300 whitespace-pre-wrap break-words">
                    {formatValue(value)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {toolCall.done && resultStr && (
        <div className="border-t border-zinc-700">
          <button
            onClick={() => setResultExpanded(!resultExpanded)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-700/50 transition-colors text-left"
          >
            {resultExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Result
            {isLongResult && (
              <span className="text-zinc-600 ml-1">
                ({(resultStr.length / 1024).toFixed(1)}k chars)
              </span>
            )}
          </button>
          {resultExpanded && (
            <pre className="px-3 py-2 text-[11px] text-zinc-300 whitespace-pre-wrap break-words max-h-64 overflow-auto leading-relaxed">
              {resultStr}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
