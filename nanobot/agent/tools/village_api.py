"""Village API tool — authenticated HTTP requests to Village's REST API."""

from __future__ import annotations

import json
import logging
from typing import Any, TYPE_CHECKING

import httpx

from nanobot.agent.tools.base import Tool

if TYPE_CHECKING:
    from nanobot.web.village_auth import VillageEnvManager

logger = logging.getLogger(__name__)

class VillageApiTool(Tool):
    """Make authenticated HTTP requests to Village's REST API.

    Supports multiple Village environments (local, staging, production).
    Uses VillageEnvManager to resolve the correct token store and base_url
    for the active environment of the current session.
    """

    def __init__(self, env_manager: VillageEnvManager):
        self._env_manager = env_manager
        self._session_key: str = ""

    def set_context(self, session_key: str) -> None:
        """Set the current session key (called by AgentLoop before each message)."""
        self._session_key = session_key

    @property
    def name(self) -> str:
        return "village_api"

    @property
    def description(self) -> str:
        return (
            "Make an authenticated HTTP request to Village's REST API as the "
            "currently connected user. Use this for reading or writing data "
            "through Village's structured API endpoints (patients, appointments, "
            "organizations, match requests, marketplace, etc.). "
            "The user must be connected to Village via OAuth first. "
            "Refer to the village/api skill and ENDPOINTS.md for available endpoints."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "description": "HTTP method: GET, POST, PUT, PATCH, or DELETE",
                    "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
                },
                "path": {
                    "type": "string",
                    "description": (
                        "API path starting with /api/v1/, "
                        "e.g. /api/v1/patients or /api/v1/appointments/123"
                    ),
                },
                "body": {
                    "type": "object",
                    "description": "JSON request body (for POST, PUT, PATCH)",
                },
                "params": {
                    "type": "object",
                    "description": "URL query parameters, e.g. {\"page\": 1, \"per_page\": 25}",
                },
            },
            "required": ["method", "path"],
        }

    async def execute(
        self,
        method: str,
        path: str,
        body: dict | None = None,
        params: dict | None = None,
        **kwargs: Any,
    ) -> str:
        if not self._session_key:
            return "Error: No session context. Cannot determine which Village user to act as."

        token_store = self._env_manager.get_active_store(self._session_key)
        base_url = self._env_manager.get_active_base_url(self._session_key)
        if not token_store or not base_url:
            return (
                "Error: No Village environment selected or not connected. "
                "Please ask the user to select an environment and click 'Connect to Village' in the sidebar."
            )

        access_token = await token_store.ensure_valid_token(self._session_key)
        if not access_token:
            return (
                "Error: Not connected to Village. "
                "Please ask the user to click 'Connect to Village' in the sidebar."
            )

        url = f"{base_url}{path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        logger.info(f"[Village API] {method} {path} -> {base_url}")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.request(
                    method=method.upper(),
                    url=url,
                    headers=headers,
                    json=body if body else None,
                    params=params if params else None,
                    timeout=30.0,
                )

            status = resp.status_code
            try:
                data = resp.json()
                text = json.dumps(data, indent=2, default=str)
            except Exception:
                text = resp.text

            if status >= 400:
                return f"HTTP {status} Error:\n{text}"

            return f"HTTP {status} OK:\n{text}"

        except httpx.TimeoutException:
            return f"Error: Request to {method} {path} timed out after 30 seconds."
        except Exception as e:
            logger.error(f"[Village API] Request failed: {e}")
            return f"Error: {e}"
