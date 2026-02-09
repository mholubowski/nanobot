"""Voice mode endpoints for Gemini Live API integration."""

import asyncio
import json
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

VOICE_PREAMBLE = """VOICE MODE: You are speaking with the user via a live voice call.
Keep responses concise and conversational — speak naturally as you would on a phone call.
Do not use markdown, code blocks, bullet points, or any formatting that doesn't work in speech.
When tools take a while to run, let the user know you're working on it.
Speak numbers and technical terms clearly. Summarize long tool outputs rather than reading them verbatim."""


def init(agent: AgentLoop, gemini_api_key: str) -> None:
    """Initialize the voice module with the agent and API key."""
    global _agent, _gemini_api_key
    _agent = agent
    _gemini_api_key = gemini_api_key


def _convert_tools_to_gemini(
    openai_tools: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Convert OpenAI-format tool schemas to Gemini function declarations.

    OpenAI: [{ type: "function", function: { name, description, parameters } }]
    Gemini: [{ functionDeclarations: [{ name, description, parameters }] }]
    """
    declarations = []
    for tool in openai_tools:
        func = tool.get("function", {})
        decl: dict[str, Any] = {
            "name": func.get("name", ""),
            "description": func.get("description", ""),
        }
        params = func.get("parameters")
        if params:
            # Gemini doesn't support JSON Schema additionalProperties, strip it
            cleaned = _clean_schema_for_gemini(params)
            decl["parameters"] = cleaned
        declarations.append(decl)
    return [{"functionDeclarations": declarations}] if declarations else []


def _clean_schema_for_gemini(schema: dict[str, Any]) -> dict[str, Any]:
    """Remove JSON Schema fields that Gemini's Live API doesn't support.

    Gemini only supports a subset of JSON Schema: type, description, properties,
    required, items, enum. Everything else must be stripped.
    """
    ALLOWED_KEYS = {
        "type",
        "description",
        "properties",
        "required",
        "items",
        "enum",
        "format",
        "nullable",
    }
    cleaned = {}
    for k, v in schema.items():
        if k not in ALLOWED_KEYS:
            continue
        if k == "properties" and isinstance(v, dict):
            cleaned[k] = {pk: _clean_schema_for_gemini(pv) for pk, pv in v.items()}
        elif k == "items" and isinstance(v, dict):
            cleaned[k] = _clean_schema_for_gemini(v)
        else:
            cleaned[k] = v
    return cleaned


@router.post("/token")
async def get_voice_token(request: Request):
    """Generate an ephemeral token and session config for Gemini Live API.

    Returns the token, model, system instruction (with full Nanobot context),
    and all tool definitions so the browser can connect directly.

    Query params:
        tools: "true" (default) or "false" — include tools in config
        model: override model name (for testing)
    """
    if not _gemini_api_key:
        return JSONResponse(
            {
                "error": "Gemini API key not configured. Set providers.gemini.apiKey in ~/.nanobot/config.json"
            },
            status_code=500,
        )

    if not _agent:
        return JSONResponse({"error": "Agent not initialized"}, status_code=500)

    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    include_tools = body.get("tools", True)
    model_override = body.get("model", None)

    # Build system prompt from Nanobot's context builder (includes skills, memory, etc.)
    system_prompt = _agent.context.build_system_prompt()
    full_prompt = f"{VOICE_PREAMBLE}\n\n{system_prompt}"

    # Get all tool definitions and convert to Gemini format
    gemini_tools: list[dict[str, Any]] = []
    if include_tools:
        openai_tools = _agent.tools.get_definitions()
        gemini_tools = _convert_tools_to_gemini(openai_tools)

    model = model_override or VOICE_MODEL
    tool_names = [
        d["name"] for t in gemini_tools for d in t.get("functionDeclarations", [])
    ]
    logger.info(
        f"[Voice] Preparing session: model={model}, {len(tool_names)} tools ({', '.join(tool_names)}), prompt length={len(full_prompt)}"
    )
    if gemini_tools:
        logger.debug(f"[Voice] Tools JSON: {json.dumps(gemini_tools, indent=2)}")

    # Generate ephemeral token using the Gemini REST API directly
    # (avoids requiring the google-genai SDK as a dependency)
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1alpha/authTokens",
                params={"key": _gemini_api_key},
                json={
                    "uses": 1,
                },
                timeout=10.0,
            )
            if resp.status_code != 200:
                # Fall back to returning the API key directly for development
                return {
                    "token": _gemini_api_key,
                    "tokenType": "apiKey",
                    "model": model,
                    "systemInstruction": full_prompt,
                    "tools": gemini_tools,
                }
            token_data = resp.json()
    except Exception:
        # Fall back to API key for development
        return {
            "token": _gemini_api_key,
            "tokenType": "apiKey",
            "model": model,
            "systemInstruction": full_prompt,
            "tools": gemini_tools,
        }

    return {
        "token": token_data.get("name", ""),
        "tokenType": "ephemeral",
        "model": model,
        "systemInstruction": full_prompt,
        "tools": gemini_tools,
    }


@router.get("/debug")
async def debug_voice_config():
    """Return the voice session config for debugging (no token generation)."""
    if not _agent:
        return JSONResponse({"error": "Agent not initialized"}, status_code=500)

    system_prompt = _agent.context.build_system_prompt()
    full_prompt = f"{VOICE_PREAMBLE}\n\n{system_prompt}"
    openai_tools = _agent.tools.get_definitions()
    gemini_tools = _convert_tools_to_gemini(openai_tools)

    return {
        "model": VOICE_MODEL,
        "promptLength": len(full_prompt),
        "promptPreview": full_prompt[:500] + "...",
        "toolCount": sum(len(t.get("functionDeclarations", [])) for t in gemini_tools),
        "tools": gemini_tools,
    }


@router.post("/tool")
async def execute_tool(request: Request):
    """Execute a tool call from the voice agent.

    Accepts { name: string, args: object } and routes through Nanobot's ToolRegistry.
    """
    if not _agent:
        return JSONResponse({"error": "Agent not initialized"}, status_code=500)

    body = await request.json()
    tool_name = body.get("name", "")
    tool_args = body.get("args", {})

    if not tool_name:
        return JSONResponse({"error": "Missing tool name"}, status_code=400)

    try:
        result = await asyncio.wait_for(
            _agent.tools.execute(tool_name, tool_args),
            timeout=120.0,
        )
        return {"result": result}
    except asyncio.TimeoutError:
        return {"result": f"Error: Tool '{tool_name}' timed out after 120 seconds."}
    except Exception as e:
        return {"result": f"Error executing tool '{tool_name}': {str(e)}"}
