import { useState } from "react";
import { type SessionInfo } from "./adapter";
import {
  Plus,
  MessageSquare,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { VillageLogo } from "./VillageLogo";

type Props = {
  sessions: SessionInfo[];
  activeKey: string;
  onNewChat: () => void;
  onSelectSession: (key: string) => void;
  onDeleteSession: (key: string) => void;
};

export function Sidebar({
  sessions,
  activeKey,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

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
    </div>
  );
}
