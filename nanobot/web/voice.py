"""Voice mode endpoints for Gemini Live API integration.

Architecture: The Gemini voice model is a thin conversational layer.
All real work (DB queries, codebase search, matchmaking, etc.) is delegated
to Nanobot's full AgentLoop via a single `ask_nanobot` tool.
"""

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from nanobot.agent.loop import AgentLoop

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Will be set by create_app when mounting the router
_agent: AgentLoop | None = None
_gemini_api_key: str = ""

VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025"

# The single tool exposed to the voice model
VOICE_TOOLS = [
    {
        "functionDeclarations": [
            {
                "name": "ask_nanobot",
                "description": (
                    "Ask the Nanobot agent to look something up, query data, "
                    "search code, run commands, find practitioners, or perform "
                    "any task that requires tools. Nanobot has access to the "
                    "Village database, codebase, and AI matchmaking service. "
                    "Pass the user's request as a natural language question. "
                    "Nanobot will figure out how to answer it."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "The question or task to delegate to Nanobot",
                        }
                    },
                    "required": ["question"],
                },
            }
        ]
    }
]

VOICE_SYSTEM_PROMPT = """\
You are the Village voice assistant. You help families find healthcare \
practitioners and answer questions about the Village platform.

You speak naturally and conversationally — this is a voice call, not a text chat. \
Keep responses concise. Do not use markdown, bullet points, or any formatting \
that doesn't work in speech.

IMPORTANT: You have ONE tool called ask_nanobot. Use it whenever the user \
asks anything that requires looking up data, querying the database, \
searching code, finding practitioners, or any task that isn't pure conversation. \
Pass the user's question as natural language — Nanobot will handle the rest.

Examples of when to use ask_nanobot:
- "How many practitioners are in the database?" → use ask_nanobot
- "Who is the CEO of Village?" → use ask_nanobot
- "What's the status of match request 123?" → use ask_nanobot
- "How does authentication work in the codebase?" → use ask_nanobot

Examples of when NOT to use it:
- "Thanks!" → just respond naturally
- "Can you repeat that?" → just respond
- "Hello" / "Goodbye" → just respond
- General knowledge questions unrelated to Village → just respond

FINDING A PRACTITIONER: When a user wants to find a therapist or provider, \
gather the following information conversationally BEFORE calling ask_nanobot:
1. What type of care? (speech therapy, occupational therapy, ABA, etc.)
2. Child's age
3. Zip code or city
4. Insurance provider (or cash pay)
5. Any specific needs or preferences (optional but helpful)
Once you have at least items 1-4, call ask_nanobot with a detailed description \
combining everything, for example: "Find a speech therapist near 90045 for a \
5 year old with Anthem Blue Cross who needs help with articulation."

When ask_nanobot is working, let the user know — it may take 10-30 seconds \
for complex queries. Say something like "Let me look that up" or "Give me a moment."

When you get results back, summarize them naturally for voice. \
Don't read raw JSON or long text — speak like a helpful person on the phone. \
For practitioner matches, mention the top recommendation by name, why they're \
a good fit, and whether they accept the family's insurance."""


def init(agent: AgentLoop, gemini_api_key: str) -> None:
    """Initialize the voice module with the agent and API key."""
    global _agent, _gemini_api_key
    _agent = agent
    _gemini_api_key = gemini_api_key


@router.post("/token")
async def get_voice_token(request: Request):
    """Generate a token and session config for Gemini Live API.

    Returns the token, model, system instruction, and the single ask_nanobot
    tool definition.
    """
    if not _gemini_api_key:
        return JSONResponse(
            {"error": "Gemini API key not configured. Set providers.gemini.apiKey in ~/.nanobot/config.json"},
            status_code=500,
        )

    if not _agent:
        return JSONResponse({"error": "Agent not initialized"}, status_code=500)

    model = VOICE_MODEL
    logger.info(f"[Voice] Preparing session: model={model}, 1 tool (ask_nanobot)")

    # Try ephemeral token, fall back to API key for dev
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://generativelanguage.googleapis.com/v1alpha/authTokens",
                params={"key": _gemini_api_key},
                json={"uses": 1},
                timeout=10.0,
            )
            if resp.status_code == 200:
                token_data = resp.json()
                return {
                    "token": token_data.get("name", ""),
                    "tokenType": "ephemeral",
                    "model": model,
                    "systemInstruction": VOICE_SYSTEM_PROMPT,
                    "tools": VOICE_TOOLS,
                }
    except Exception:
        pass

    # Fallback: return API key directly
    return {
        "token": _gemini_api_key,
        "tokenType": "apiKey",
        "model": model,
        "systemInstruction": VOICE_SYSTEM_PROMPT,
        "tools": VOICE_TOOLS,
    }


@router.post("/tool")
async def execute_tool(request: Request):
    """Execute a tool call from the voice agent.

    The only expected tool is `ask_nanobot`, which runs the question through
    Nanobot's full AgentLoop (same brain as text chat).
    """
    if not _agent:
        return JSONResponse({"error": "Agent not initialized"}, status_code=500)

    body = await request.json()
    tool_name = body.get("name", "")
    tool_args = body.get("args", {})

    if not tool_name:
        return JSONResponse({"error": "Missing tool name"}, status_code=400)

    if tool_name == "ask_nanobot":
        question = tool_args.get("question", "")
        if not question:
            return {"result": "No question provided."}

        logger.info(f"[Voice] ask_nanobot: {question[:200]}")

        try:
            result = await asyncio.wait_for(
                _agent.process_direct(
                    content=question,
                    session_key="voice:current",
                    channel="voice",
                    chat_id="voice",
                ),
                timeout=120.0,
            )
            logger.info(f"[Voice] ask_nanobot result: {(result or '')[:200]}")
            return {"result": result or "No answer."}
        except asyncio.TimeoutError:
            return {"result": "Sorry, that query took too long. Please try a simpler question."}
        except Exception as e:
            logger.error(f"[Voice] ask_nanobot error: {e}")
            return {"result": f"Error: {str(e)}"}

    # Fallback for any other tool name (shouldn't happen)
    return {"result": f"Unknown tool: {tool_name}"}
