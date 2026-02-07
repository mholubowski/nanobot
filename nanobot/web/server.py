"""FastAPI server for the nanobot web UI."""

import asyncio
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from nanobot.agent.loop import AgentLoop

STATIC_DIR = Path(__file__).parent / "static"


def create_app(agent: AgentLoop) -> FastAPI:
    """Create the FastAPI application.

    Args:
        agent: An initialised AgentLoop instance.

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
