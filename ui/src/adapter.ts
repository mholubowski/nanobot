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
  model?: string,
): AsyncGenerator<AgentEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_key: sessionKey, model }),
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

// ------------------------------------------------------------------
// Tools
// ------------------------------------------------------------------

export type ToolParam = {
  name: string;
  type: string;
  description: string;
  required: boolean;
};

export type ToolInfo = {
  name: string;
  description: string;
  parameters: ToolParam[];
};

/**
 * Fetch the list of all registered tools.
 */
export async function fetchTools(): Promise<ToolInfo[]> {
  const res = await fetch("/api/tools");
  if (!res.ok) return [];
  return res.json();
}

// ------------------------------------------------------------------
// Village OAuth
// ------------------------------------------------------------------

export type VillageStatus = {
  configured: boolean;
  connected: boolean;
  user_email?: string;
  user_id?: number;
};

/**
 * Check whether Village is configured and connected for this session.
 */
export async function fetchVillageStatus(sessionKey: string): Promise<VillageStatus> {
  const res = await fetch(`/api/village/status?session_key=${encodeURIComponent(sessionKey)}`);
  if (!res.ok) return { configured: false, connected: false };
  return res.json();
}

/**
 * Get the Village OAuth authorization URL.
 */
export async function fetchVillageAuthorizeUrl(sessionKey: string): Promise<{ url: string; redirect_uri: string } | null> {
  const res = await fetch(`/api/village/authorize_url?session_key=${encodeURIComponent(sessionKey)}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Exchange an OAuth authorization code for tokens.
 */
export async function sendVillageCallback(
  code: string,
  sessionKey: string,
  redirectUri: string,
): Promise<{ connected: boolean; user_email?: string; user_id?: number } | null> {
  const res = await fetch("/api/village/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, session_key: sessionKey, redirect_uri: redirectUri }),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Disconnect from Village for this session.
 */
export async function disconnectVillage(sessionKey: string): Promise<void> {
  await fetch("/api/village/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_key: sessionKey }),
  });
}

// ------------------------------------------------------------------
// Skills
// ------------------------------------------------------------------

export type SkillInfo = {
  name: string;
  description: string;
  emoji: string;
  source: string;
  always: boolean;
  available: boolean;
};

export type SkillContent = {
  name: string;
  content: string;
};

/**
 * Fetch the list of all skills.
 */
export async function fetchSkills(): Promise<SkillInfo[]> {
  const res = await fetch("/api/skills");
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fetch the full markdown content of a skill.
 */
export async function fetchSkillContent(name: string): Promise<SkillContent | null> {
  const res = await fetch(`/api/skills/${encodeURIComponent(name)}/content`);
  if (!res.ok) return null;
  return res.json();
}
