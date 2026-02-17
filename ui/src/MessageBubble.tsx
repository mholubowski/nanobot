import { type Message } from "./App";
import { ToolCallCard } from "./ToolCallCard";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Loader2 } from "lucide-react";
import { VillageLogo } from "./VillageLogo";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 max-w-3xl mx-auto ${isUser ? "justify-end" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-village/15 flex items-center justify-center mt-0.5">
          <VillageLogo className="size-4 text-village" />
        </div>
      )}

      <div className={`flex flex-col gap-2 min-w-0 ${isUser ? "items-end" : "flex-1"}`}>
        {/* User message */}
        {isUser && (
          <div className="rounded-2xl rounded-tr-sm bg-village text-white px-4 py-2.5 text-sm max-w-lg">
            {message.content}
          </div>
        )}

        {/* Assistant message */}
        {!isUser && (
          <>
            {/* Thinking indicator */}
            {message.isThinking && !message.toolCalls?.length && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="size-3.5 animate-spin text-village" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Tool calls */}
            {message.toolCalls?.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}

            {/* Thinking after tool calls */}
            {message.isThinking && (message.toolCalls?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="size-3.5 animate-spin text-village" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Text response */}
            {message.content && (
              <div className="agent-prose prose prose-sm prose-invert prose-zinc max-w-none text-sm text-zinc-200 leading-relaxed">
                <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
              </div>
            )}
          </>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center mt-0.5">
          <User className="size-4 text-zinc-300" />
        </div>
      )}
    </div>
  );
}
