/**
 * SSE event types emitted by the nanobot backend.
 */
export type AgentEvent =
  | { type: "thinking" }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; result: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string };

export type SessionInfo = {
  key: string;
  preview: string;
  updated_at: string;
};

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

/**
 * Send a message to the nanobot backend and stream SSE events.
 */
export async function* streamChat(
  message: string,
  sessionKey: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_key: sessionKey }),
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

/**
 * Fetch the list of web sessions.
 */
export async function fetchSessions(): Promise<SessionInfo[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fetch message history for a session.
 */
export async function fetchMessages(key: string): Promise<HistoryMessage[]> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(key)}/messages`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Delete a session.
 */
export async function deleteSession(key: string): Promise<boolean> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  return res.ok;
}
