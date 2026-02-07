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
} from "lucide-react";

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
};

function getSummary(name: string, args: Record<string, unknown>): string {
  const str = (key: string) => (typeof args[key] === "string" ? (args[key] as string) : "");

  switch (name) {
    case "exec":
      return str("command").slice(0, 100);
    case "read_file":
    case "write_file":
    case "edit_file":
    case "list_dir":
      return str("path");
    case "search":
      return str("pattern");
    case "find_files":
      return str("pattern");
    case "web_search":
      return str("query");
    case "web_fetch":
      return str("url");
    default: {
      const first = Object.values(args).find((v) => typeof v === "string");
      return typeof first === "string" ? first.slice(0, 80) : "";
    }
  }
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[toolCall.name] ?? <Terminal className="size-3.5" />;
  const summary = getSummary(toolCall.name, toolCall.args);

  const resultStr = toolCall.result ?? "";
  const resultPreview =
    resultStr.length > 500 ? resultStr.slice(0, 500) + "…" : resultStr;

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

      {/* Args summary */}
      {summary && (
        <div className="px-3 pb-2 font-mono text-xs text-zinc-400 truncate">
          {summary}
        </div>
      )}

      {/* Result */}
      {toolCall.done && resultPreview && (
        <div className="border-t border-zinc-700">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700/50 transition-colors text-left"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Result
          </button>
          {expanded && (
            <pre className="px-3 py-2 text-xs text-zinc-300 whitespace-pre-wrap break-words max-h-48 overflow-auto">
              {resultPreview}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
