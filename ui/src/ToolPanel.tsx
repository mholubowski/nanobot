import { useEffect, useState } from "react";
import { fetchTools, type ToolInfo } from "./adapter";
import { X, Loader2, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  toolName: string | null;
  onClose: () => void;
};

const TOOL_ICONS: Record<string, string> = {
  exec: "⚡",
  read_file: "📄",
  write_file: "✏️",
  edit_file: "✏️",
  list_dir: "📁",
  search: "🔍",
  find_files: "🔎",
  web_search: "🌐",
  web_fetch: "🌐",
  message: "💬",
  spawn: "🧵",
  cron: "⏰",
};

const HOW_TOOLS_WORK = `## How Tools Work

Every tool is a Python class that extends a base \`Tool\` class. It defines four things:

1. **\`name\`** — a string like \`"exec"\` or \`"read_file"\` (this is what the LLM calls)
2. **\`description\`** — plain English explaining what the tool does (the LLM reads this to decide when to use it)
3. **\`parameters\`** — a JSON Schema describing the arguments (the LLM uses this to know what to pass)
4. **\`execute(**kwargs)\`** — the actual implementation, returns a string result

### The Flow

The \`ToolRegistry\` is the glue. At startup, the agent creates a registry and registers all tools. Then:

1. **Before each LLM call** — \`registry.get_definitions()\` converts every tool into OpenAI's function-calling format and passes them alongside the messages. The LLM sees these as callable functions.

2. **LLM responds with tool calls** — instead of text, the LLM returns something like \`{"name": "exec", "arguments": {"command": "ls -la"}}\`.

3. **Registry executes** — the registry looks up the tool, validates the params against the JSON Schema (type checking, required fields, enums, min/max), then calls \`tool.execute()\`.

4. **Result goes back** — the string result gets appended to the conversation as a tool result message, and the LLM is called again to decide what to do next (call another tool, or respond with text).

### Village Integration

The Village-specific capabilities (database queries, matchmaking) aren't separate tools — they work through \`exec\` running bridge shell scripts (\`nanobot_console.sh\`, \`nanobot_matchmaking.sh\`). The **skills** teach the agent *when and how* to use \`exec\` for those purposes.
`;

function ToolDetail({ tool }: { tool: ToolInfo }) {
  const required = tool.parameters.filter((p) => p.required);
  const optional = tool.parameters.filter((p) => !p.required);

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-zinc-300 leading-relaxed">{tool.description}</p>

      {/* Parameters */}
      {tool.parameters.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Parameters
          </h4>
          <div className="space-y-2">
            {required.map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2"
              >
                <code className="text-xs font-mono text-village shrink-0 mt-0.5">
                  {p.name}
                </code>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-village/15 text-village shrink-0 mt-0.5">
                  required
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 shrink-0 mt-0.5">
                  {p.type}
                </span>
                {p.description && (
                  <span className="text-xs text-zinc-400 leading-relaxed">
                    {p.description}
                  </span>
                )}
              </div>
            ))}
            {optional.map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 px-3 py-2"
              >
                <code className="text-xs font-mono text-zinc-300 shrink-0 mt-0.5">
                  {p.name}
                </code>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 shrink-0 mt-0.5">
                  {p.type}
                </span>
                {p.description && (
                  <span className="text-xs text-zinc-400 leading-relaxed">
                    {p.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolPanel({ toolName, onClose }: Props) {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(toolName);

  useEffect(() => {
    fetchTools().then((t) => {
      setTools(t);
      setLoading(false);
    });
  }, []);

  // When toolName changes from sidebar, expand that tool
  useEffect(() => {
    if (toolName) setExpandedTool(toolName);
  }, [toolName]);

  const selectedTool = toolName
    ? tools.find((t) => t.name === toolName)
    : null;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="size-4 text-village" />
          <span className="text-sm font-semibold text-zinc-200 truncate">
            {selectedTool ? selectedTool.name : "Tools"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 shrink-0">
            {selectedTool ? "TOOL" : `${tools.length} tools`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : selectedTool ? (
          /* Single tool detail view */
          <ToolDetail tool={selectedTool} />
        ) : (
          /* All tools overview */
          <div className="space-y-6">
            {/* How tools work explanation */}
            <div className="agent-prose prose prose-sm prose-invert prose-zinc max-w-none text-sm text-zinc-300 leading-relaxed">
              <Markdown remarkPlugins={[remarkGfm]}>{HOW_TOOLS_WORK}</Markdown>
            </div>

            <hr className="border-zinc-800" />

            {/* Tool list */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Registered Tools
              </h3>
              <div className="space-y-1">
                {tools.map((tool) => (
                  <div key={tool.name}>
                    <button
                      onClick={() =>
                        setExpandedTool(
                          expandedTool === tool.name ? null : tool.name,
                        )
                      }
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <span className="text-base leading-none shrink-0 w-5 text-center">
                        {TOOL_ICONS[tool.name] ?? "🔧"}
                      </span>
                      <code className="font-mono text-xs text-zinc-200">
                        {tool.name}
                      </code>
                      <span className="text-xs text-zinc-500 truncate flex-1">
                        {tool.description.slice(0, 60)}
                        {tool.description.length > 60 ? "…" : ""}
                      </span>
                      {expandedTool === tool.name ? (
                        <ChevronDown className="size-3 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="size-3 text-zinc-500 shrink-0" />
                      )}
                    </button>
                    {expandedTool === tool.name && (
                      <div className="ml-7 mr-3 mb-3 mt-1 pl-3 border-l-2 border-zinc-800">
                        <ToolDetail tool={tool} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
