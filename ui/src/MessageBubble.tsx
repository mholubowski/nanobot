import { type Message } from "./App";
import { ToolCallCard } from "./ToolCallCard";
import Markdown from "react-markdown";
import { User, Bot, Loader2 } from "lucide-react";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 max-w-3xl mx-auto ${isUser ? "justify-end" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mt-0.5">
          <Bot className="size-4 text-indigo-600 dark:text-indigo-400" />
        </div>
      )}

      <div className={`flex flex-col gap-2 min-w-0 ${isUser ? "items-end" : "flex-1"}`}>
        {/* User message */}
        {isUser && (
          <div className="rounded-2xl rounded-tr-sm bg-indigo-600 text-white px-4 py-2.5 text-sm max-w-lg">
            {message.content}
          </div>
        )}

        {/* Assistant message */}
        {!isUser && (
          <>
            {/* Thinking indicator */}
            {message.isThinking && !message.toolCalls?.length && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Tool calls */}
            {message.toolCalls?.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}

            {/* Thinking after tool calls */}
            {message.isThinking && (message.toolCalls?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Text response */}
            {message.content && (
              <div className="prose prose-sm dark:prose-invert prose-zinc max-w-none text-sm text-zinc-800 dark:text-zinc-200">
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mt-0.5">
          <User className="size-4 text-zinc-600 dark:text-zinc-300" />
        </div>
      )}
    </div>
  );
}
