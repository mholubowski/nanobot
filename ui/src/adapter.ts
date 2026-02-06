/**
 * SSE event types emitted by the nanobot backend.
 */
export type AgentEvent =
  | { type: "thinking" }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; result: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string };

/**
 * Send a message to the nanobot backend and stream SSE events.
 */
export async function* streamChat(
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok || !response.body) {
    yield { type: "error", message: "Failed to connect to nanobot." };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ") && eventType) {
        try {
          const data = JSON.parse(line.slice(6));
          yield { type: eventType, ...data } as AgentEvent;
        } catch {
          // skip malformed JSON
        }
        eventType = "";
      } else if (line === "") {
        eventType = "";
      }
    }
  }
}
