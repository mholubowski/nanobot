import { useState } from "react";
import { type SessionInfo, type SkillInfo, type ToolInfo } from "./adapter";
import {
  Plus,
  MessageSquare,
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wrench,
} from "lucide-react";
import { VillageLogo } from "./VillageLogo";

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

type Props = {
  sessions: SessionInfo[];
  skills: SkillInfo[];
  tools: ToolInfo[];
  activeKey: string;
  onNewChat: () => void;
  onSelectSession: (key: string) => void;
  onDeleteSession: (key: string) => void;
  onSelectSkill: (name: string) => void;
  onSelectTool: (name: string | null) => void;
};

export function Sidebar({
  sessions,
  skills,
  tools,
  activeKey,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onSelectSkill,
  onSelectTool,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 px-2 border-r border-zinc-800 bg-zinc-900 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="size-4" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="New chat"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 border-r border-zinc-800 bg-zinc-900 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <VillageLogo className="size-4 text-village" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Chats
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* New chat button */}
      <div className="p-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <Plus className="size-4" />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {sessions.map((s) => (
          <div
            key={s.key}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
              s.key === activeKey
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
            onClick={() => onSelectSession(s.key)}
          >
            <MessageSquare className="size-3.5 shrink-0 opacity-50" />
            <span className="truncate flex-1">{s.preview}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.key);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
              title="Delete conversation"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">
            No conversations yet
          </p>
        )}
      </div>

      {/* Tools section */}
      <div className="border-t border-zinc-800">
        <button
          onClick={() => setToolsOpen(!toolsOpen)}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
        >
          <Wrench className="size-3.5" />
          <span className="flex-1 text-left">Tools</span>
          <span className="text-[10px] font-normal normal-case text-zinc-600">
            {tools.length}
          </span>
          {toolsOpen ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </button>
        {toolsOpen && (
          <div className="px-2 pb-2 space-y-0.5 max-h-52 overflow-y-auto">
            {/* "How tools work" overview link */}
            <button
              onClick={() => onSelectTool(null)}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-colors text-left italic"
            >
              <span className="text-base leading-none shrink-0 w-5 text-center">📖</span>
              <span className="truncate flex-1">How tools work</span>
            </button>
            {tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => onSelectTool(tool.name)}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors text-left"
                title={tool.description}
              >
                <span className="text-base leading-none shrink-0 w-5 text-center">
                  {TOOL_ICONS[tool.name] ?? "🔧"}
                </span>
                <span className="truncate flex-1 font-mono text-xs">{tool.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Skills section */}
      <div className="border-t border-zinc-800">
        <button
          onClick={() => setSkillsOpen(!skillsOpen)}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
        >
          <Sparkles className="size-3.5" />
          <span className="flex-1 text-left">Skills</span>
          <span className="text-[10px] font-normal normal-case text-zinc-600">
            {skills.length}
          </span>
          {skillsOpen ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </button>
        {skillsOpen && (
          <div className="px-2 pb-2 space-y-0.5 max-h-52 overflow-y-auto">
            {skills.map((skill) => (
              <button
                key={skill.name}
                onClick={() => onSelectSkill(skill.name)}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors text-left"
                title={skill.description}
              >
                <span className="text-base leading-none shrink-0 w-5 text-center">
                  {skill.emoji || "📦"}
                </span>
                <span className="truncate flex-1">{skill.name}</span>
                {skill.always && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-village/20 text-village shrink-0">
                    auto
                  </span>
                )}
                {!skill.available && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                    n/a
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
