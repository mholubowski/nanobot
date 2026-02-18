"""FastAPI server for the nanobot web UI."""

import asyncio
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from nanobot.agent.loop import AgentLoop
from nanobot.agent.tools.village_api import VillageApiTool
from nanobot.config.schema import VillageConfig
from nanobot.web.village_auth import VillageTokenStore
from nanobot.web.voice import router as voice_router, init as voice_init

STATIC_DIR = Path(__file__).parent / "static"


def create_app(
    agent: AgentLoop,
    gemini_api_key: str = "",
    village_config: VillageConfig | None = None,
) -> FastAPI:
    """Create the FastAPI application.

    Args:
        agent: An initialised AgentLoop instance.
        gemini_api_key: Optional Gemini API key for voice mode.
        village_config: Optional Village API OAuth configuration.

    Returns:
        A configured FastAPI app.
    """
    app = FastAPI(title="nanobot", docs_url=None, redoc_url=None)

    # CORS — allow Vite dev server during development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Voice mode endpoints (Gemini Live API)
    voice_init(agent, gemini_api_key)
    app.include_router(voice_router)

    # Village OAuth token store (shared across endpoints and agent tool)
    village_cfg = village_config
    village_tokens: VillageTokenStore | None = None
    if village_cfg and village_cfg.client_id:
        village_tokens = VillageTokenStore(
            base_url=village_cfg.base_url,
            client_id=village_cfg.client_id,
            client_secret=village_cfg.client_secret,
        )
        app.state.village_tokens = village_tokens

        # Register the village_api tool so the agent can make API calls
        village_tool = VillageApiTool(
            token_store=village_tokens,
            base_url=village_cfg.base_url,
        )
        agent.tools.register(village_tool)

    # ------------------------------------------------------------------
    # POST /api/chat — SSE streaming endpoint
    # ------------------------------------------------------------------

    @app.post("/api/chat")
    async def chat(request: Request):
        body = await request.json()
        user_message: str = ""

        # Accept { message: "..." } or { messages: [...] }
        if "message" in body:
            user_message = body["message"]
        elif "messages" in body:
            msgs = body["messages"]
            # Take the last user message
            for m in reversed(msgs):
                if m.get("role") == "user":
                    user_message = m.get("content", "")
                    break

        if not user_message:
            return JSONResponse({"error": "No message provided"}, status_code=400)

        # Use session_key from request, default to "web:default"
        model_override: str | None = body.get("model")
        session_key = body.get("session_key", "web:default")
        # Ensure web sessions are prefixed
        if not session_key.startswith("web:"):
            session_key = f"web:{session_key}"

        # Async queue to shuttle events from the agent callback to the SSE generator
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

        async def on_event(event_type: str, data: dict[str, Any]) -> None:
            await queue.put({"event": event_type, "data": data})

        async def run_agent():
            try:
                await agent.process_with_events(
                    content=user_message,
                    on_event=on_event,
                    session_key=session_key,
                    model_override=model_override,
                )
            except Exception as exc:
                await queue.put({
                    "event": "error",
                    "data": {"message": str(exc)},
                })
            finally:
                await queue.put(None)  # sentinel

        # Kick off the agent in the background
        task = asyncio.create_task(run_agent())

        async def event_stream():
            try:
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    line = f"event: {item['event']}\ndata: {json.dumps(item['data'])}\n\n"
                    yield line
            finally:
                if not task.done():
                    task.cancel()

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    # ------------------------------------------------------------------
    # GET /api/sessions — list web sessions
    # ------------------------------------------------------------------

    @app.get("/api/sessions")
    async def list_sessions():
        all_sessions = agent.sessions.list_sessions()
        # Filter to web sessions and enrich with preview
        results = []
        for s in all_sessions:
            key = s.get("key", "")
            if not key.startswith("web"):
                continue
            # Load last user message as preview
            preview = ""
            path = s.get("path")
            if path:
                try:
                    with open(path) as f:
                        lines = f.readlines()
                    # Find the first user message for a title
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if data.get("role") == "user" and data.get("content"):
                                preview = data["content"][:100]
                                break
                        except json.JSONDecodeError:
                            continue
                except Exception:
                    pass
            results.append({
                "key": key,
                "preview": preview or "New conversation",
                "updated_at": s.get("updated_at", ""),
            })
        return results

    # ------------------------------------------------------------------
    # GET /api/sessions/{key}/messages — load session history
    # ------------------------------------------------------------------

    @app.get("/api/sessions/{key:path}/messages")
    async def get_session_messages(key: str):
        session = agent.sessions.get_or_create(key)
        messages = []
        for m in session.messages:
            if m.get("_type") == "metadata":
                continue
            messages.append({
                "role": m.get("role", ""),
                "content": m.get("content", ""),
                "timestamp": m.get("timestamp", ""),
            })
        return messages

    # ------------------------------------------------------------------
    # DELETE /api/sessions/{key} — delete a session
    # ------------------------------------------------------------------

    @app.delete("/api/sessions/{key:path}")
    async def delete_session(key: str):
        deleted = agent.sessions.delete(key)
        if deleted:
            return {"status": "deleted"}
        return JSONResponse({"error": "Session not found"}, status_code=404)

    # ------------------------------------------------------------------
    # GET /api/skills — list all skills with metadata
    # ------------------------------------------------------------------

    @app.get("/api/skills")
    async def list_skills():
        skills_loader = agent.context.skills
        all_skills = skills_loader.list_skills(filter_unavailable=False)
        results = []
        for s in all_skills:
            meta = skills_loader.get_skill_metadata(s["name"]) or {}
            # Parse nanobot-specific metadata for emoji
            nanobot_meta = skills_loader._parse_nanobot_metadata(meta.get("metadata", ""))
            emoji = nanobot_meta.get("emoji", "")
            available = skills_loader._check_requirements(nanobot_meta)
            always = meta.get("always", "false").lower() == "true" if isinstance(meta.get("always"), str) else bool(meta.get("always"))
            results.append({
                "name": s["name"],
                "description": meta.get("description", s["name"]),
                "emoji": emoji,
                "source": s["source"],
                "always": always,
                "available": available,
            })
        return results

    # ------------------------------------------------------------------
    # GET /api/skills/{name}/content — full skill markdown content
    # ------------------------------------------------------------------

    @app.get("/api/skills/{name:path}/content")
    async def get_skill_content(name: str):
        skills_loader = agent.context.skills
        content = skills_loader.load_skill(name)
        if content is None:
            return JSONResponse({"error": "Skill not found"}, status_code=404)
        # Strip frontmatter for cleaner display
        stripped = skills_loader._strip_frontmatter(content)
        return {"name": name, "content": stripped}

    # ------------------------------------------------------------------
    # GET /api/tools — list all registered tools with metadata
    # ------------------------------------------------------------------

    @app.get("/api/tools")
    async def list_tools():
        results = []
        for defn in agent.tools.get_definitions():
            fn = defn.get("function", {})
            params = fn.get("parameters", {})
            props = params.get("properties", {})
            required = params.get("required", [])

            param_list = []
            for pname, pschema in props.items():
                param_list.append({
                    "name": pname,
                    "type": pschema.get("type", "string"),
                    "description": pschema.get("description", ""),
                    "required": pname in required,
                })

            results.append({
                "name": fn.get("name", ""),
                "description": fn.get("description", ""),
                "parameters": param_list,
            })
        return results

    # ------------------------------------------------------------------
    # Village OAuth endpoints
    # ------------------------------------------------------------------

    @app.get("/api/village/authorize_url")
    async def village_authorize_url(request: Request, session_key: str = ""):
        if not village_cfg or not village_cfg.client_id:
            return JSONResponse({"error": "Village integration not configured"}, status_code=501)

        # Build the redirect URI from the request's origin
        base = str(request.base_url).rstrip("/")
        redirect_uri = f"{base}/oauth/callback"

        url = (
            f"{village_cfg.base_url}/oauth/authorize"
            f"?client_id={village_cfg.client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&response_type=code"
            f"&scope=public"
        )
        return {"url": url, "redirect_uri": redirect_uri}

    @app.post("/api/village/callback")
    async def village_callback(request: Request):
        if not village_tokens:
            return JSONResponse({"error": "Village integration not configured"}, status_code=501)

        body = await request.json()
        code = body.get("code", "")
        session_key = body.get("session_key", "")
        redirect_uri = body.get("redirect_uri", "")

        if not code or not session_key:
            return JSONResponse({"error": "Missing code or session_key"}, status_code=400)

        # Ensure web session prefix
        if not session_key.startswith("web:"):
            session_key = f"web:{session_key}"

        try:
            token = await village_tokens.exchange_code(code, redirect_uri, session_key)
            return {
                "connected": True,
                "user_email": token.user_email,
                "user_id": token.user_id,
            }
        except Exception as e:
            return JSONResponse({"error": f"OAuth exchange failed: {e}"}, status_code=400)

    @app.get("/api/village/status")
    async def village_status(session_key: str = ""):
        if not village_tokens:
            return {"configured": False, "connected": False}

        if not session_key.startswith("web:"):
            session_key = f"web:{session_key}"

        token = village_tokens.get(session_key)
        if token:
            return {
                "configured": True,
                "connected": True,
                "user_email": token.user_email,
                "user_id": token.user_id,
            }
        return {"configured": True, "connected": False}

    @app.post("/api/village/disconnect")
    async def village_disconnect(request: Request):
        if not village_tokens:
            return {"disconnected": True}

        body = await request.json()
        session_key = body.get("session_key", "")
        if not session_key.startswith("web:"):
            session_key = f"web:{session_key}"

        village_tokens.remove(session_key)
        return {"disconnected": True}

    # ------------------------------------------------------------------
    # GET /oauth/callback — lightweight page for OAuth popup redirect
    # ------------------------------------------------------------------

    OAUTH_CALLBACK_HTML = """<!DOCTYPE html>
<html><head><title>Connecting...</title></head>
<body><p>Connecting to Village...</p><script>
const code = new URLSearchParams(window.location.search).get("code");
if (code && window.opener) {
  window.opener.postMessage({ type: "village_oauth_callback", code }, "*");
  document.body.innerHTML = "<p>Connected! You can close this window.</p>";
} else {
  document.body.innerHTML = "<p>Error: missing authorization code.</p>";
}
setTimeout(() => window.close(), 1500);
</script></body></html>"""

    @app.get("/oauth/callback")
    async def oauth_callback():
        return HTMLResponse(content=OAUTH_CALLBACK_HTML)

    # ------------------------------------------------------------------
    # GET /api/health
    # ------------------------------------------------------------------

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    # ------------------------------------------------------------------
    # Static files — serve built frontend (if it exists)
    # ------------------------------------------------------------------

    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

    return app
