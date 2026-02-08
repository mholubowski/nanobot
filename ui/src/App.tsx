import { useState, useRef, useCallback, useEffect } from "react";
import {
  streamChat,
  fetchSessions,
  fetchMessages,
  fetchSkills,
  deleteSession as apiDeleteSession,
  type SessionInfo,
  type SkillInfo,
} from "./adapter";
import { MessageBubble } from "./MessageBubble";
import { Sidebar } from "./Sidebar";
import { SkillPanel } from "./SkillPanel";
import { Send } from "lucide-react";
import { VillageLogo } from "./VillageLogo";

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  done: boolean;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  isThinking?: boolean;
};

function generateKey(): string {
  return `web:${crypto.randomUUID().slice(0, 8)}`;
}

function getInitialKey(): string {
  const stored = localStorage.getItem("nanobot_session_key");
  if (stored) return stored;
  const key = generateKey();
  localStorage.setItem("nanobot_session_key", key);
  return key;
}

export default function App() {
  const [sessionKey, setSessionKey] = useState(getInitialKey);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Load sessions list on mount
  const refreshSessions = useCallback(async () => {
    const list = await fetchSessions();
    setSessions(list);
  }, []);

  useEffect(() => {
    refreshSessions();
    // Load skills once on mount
    fetchSkills().then(setSkills);
  }, [refreshSessions]);

  // Load message history when session key changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const history = await fetchMessages(sessionKey);
      if (cancelled) return;
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
      } else {
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const handleNewChat = useCallback(() => {
    const key = generateKey();
    setSessionKey(key);
    localStorage.setItem("nanobot_session_key", key);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const handleSelectSession = useCallback((key: string) => {
    setSessionKey(key);
    localStorage.setItem("nanobot_session_key", key);
    setInput("");
  }, []);

  const handleDeleteSession = useCallback(
    async (key: string) => {
      await apiDeleteSession(key);
      setSessions((prev) => prev.filter((s) => s.key !== key));
      if (key === sessionKey) {
        handleNewChat();
      }
    },
    [sessionKey, handleNewChat],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Add user message + placeholder assistant message
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      isThinking: true,
      toolCalls: [],
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      for await (const event of streamChat(
        text,
        sessionKey,
        abortController.signal,
      )) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.toolCalls = [...(last.toolCalls ?? [])];

          switch (event.type) {
            case "thinking":
              last.isThinking = true;
              break;
            case "tool_call":
              last.isThinking = false;
              last.toolCalls.push({
                id: event.id,
                name: event.name,
                args: event.args,
                done: false,
              });
              break;
            case "tool_result": {
              const tc = last.toolCalls.find((t) => t.id === event.id);
              if (tc) {
                tc.result = event.result;
                tc.done = true;
              }
              break;
            }
            case "text":
              last.isThinking = false;
              last.content = event.content;
              break;
            case "error":
              last.isThinking = false;
              last.content = `Error: ${event.message}`;
              break;
          }

          updated[updated.length - 1] = last;
          return updated;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.isThinking = false;
          last.content = "Connection lost.";
          updated[updated.length - 1] = last;
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      // Refresh sidebar so new conversation appears
      refreshSessions();
    }
  }, [input, isLoading, sessionKey, refreshSessions]);

  return (
    <div className="flex h-dvh bg-zinc-950">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        skills={skills}
        activeKey={sessionKey}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onSelectSkill={(name) => setActiveSkill(name)}
      />

      {/* Skill detail panel — replaces chat when a skill is selected */}
      {activeSkill ? (
        <div className="flex flex-col flex-1 min-w-0">
          <SkillPanel
            skillName={activeSkill}
            onClose={() => setActiveSkill(null)}
          />
        </div>
      ) : (
      /* Main chat area */
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <VillageLogo className="size-5 text-village" />
          <h1 className="text-sm font-semibold text-zinc-200">
            Village Agent
          </h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
              <VillageLogo className="size-12 text-village/40" />
              <p className="text-sm text-zinc-500">
                Send a message to get started.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 bg-zinc-900 p-4">
          <form
            className="flex items-center gap-2 max-w-3xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Village Agent anything..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-village/60 disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-village hover:bg-village-dark disabled:opacity-40 p-2.5 text-white transition-colors"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}
