import { useState, useRef, useCallback, useEffect } from "react";
import { streamChat, type AgentEvent } from "./adapter";
import { MessageBubble } from "./MessageBubble";
import { Send, Bot } from "lucide-react";

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

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Add user message + placeholder assistant message
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "", isThinking: true, toolCalls: [] };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      for await (const event of streamChat(text, abortController.signal)) {
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
    }
  }, [input, isLoading]);

  return (
    <div className="flex flex-col h-dvh bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Bot className="size-5 text-indigo-500" />
        <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">nanobot</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 gap-2">
            <Bot className="size-10" />
            <p className="text-sm">Send a message to get started.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <form
          className="flex items-center gap-2 max-w-3xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask nanobot anything..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 p-2.5 text-white transition-colors"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
