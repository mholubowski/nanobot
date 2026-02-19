"""In-memory token store for Village OAuth2 sessions.

Maps nanobot session keys to Village OAuth tokens (access + refresh).
Handles automatic token refresh when expired.
"""

import time
import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

# Refresh 60 seconds before actual expiry to avoid race conditions
REFRESH_BUFFER_SECONDS = 60


@dataclass
class VillageToken:
    access_token: str
    refresh_token: str
    expires_at: float  # Unix timestamp
    user_email: str = ""
    user_id: int | None = None

    @property
    def expired(self) -> bool:
        return time.time() >= (self.expires_at - REFRESH_BUFFER_SECONDS)


class VillageTokenStore:
    """Per-session storage for Village OAuth tokens."""

    def __init__(self, base_url: str, client_id: str, client_secret: str):
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self._tokens: dict[str, VillageToken] = {}

    # ── Store / retrieve / remove ─────────────────────────────────────

    def store(
        self,
        session_key: str,
        access_token: str,
        refresh_token: str,
        expires_in: int,
        user_email: str = "",
        user_id: int | None = None,
    ) -> None:
        self._tokens[session_key] = VillageToken(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=time.time() + expires_in,
            user_email=user_email,
            user_id=user_id,
        )

    def get(self, session_key: str) -> VillageToken | None:
        return self._tokens.get(session_key)

    def remove(self, session_key: str) -> bool:
        return self._tokens.pop(session_key, None) is not None

    def is_connected(self, session_key: str) -> bool:
        return session_key in self._tokens

    # ── Token exchange (authorization code → tokens) ──────────────────

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
        session_key: str,
    ) -> VillageToken:
        """Exchange an authorization code for access + refresh tokens."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                },
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()

            # Fetch user info with the new token
            user_email, user_id = await self._fetch_user_info(
                client, data["access_token"]
            )

        token = VillageToken(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", ""),
            expires_at=time.time() + data.get("expires_in", 3600),
            user_email=user_email,
            user_id=user_id,
        )
        self._tokens[session_key] = token
        logger.info(f"[Village] Connected session {session_key} as {user_email}")
        return token

    # ── Auto-refresh ──────────────────────────────────────────────────

    async def ensure_valid_token(self, session_key: str) -> str | None:
        """Return a valid access token, refreshing if needed. None if not connected."""
        token = self._tokens.get(session_key)
        if not token:
            return None

        if token.expired and token.refresh_token:
            await self._refresh(session_key, token)

        return token.access_token

    async def _refresh(self, session_key: str, token: VillageToken) -> None:
        """Refresh an expired token."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/oauth/token",
                    json={
                        "grant_type": "refresh_token",
                        "refresh_token": token.refresh_token,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                    timeout=15.0,
                )
                resp.raise_for_status()
                data = resp.json()

            token.access_token = data["access_token"]
            token.refresh_token = data.get("refresh_token", token.refresh_token)
            token.expires_at = time.time() + data.get("expires_in", 3600)
            logger.info(f"[Village] Refreshed token for session {session_key}")
        except Exception as e:
            logger.error(f"[Village] Token refresh failed for {session_key}: {e}")
            self._tokens.pop(session_key, None)

    # ── Helpers ────────────────────────────────────────────────────────

    async def _fetch_user_info(
        self, client: httpx.AsyncClient, access_token: str
    ) -> tuple[str, int | None]:
        """Fetch the connected user's email and ID via Village's REST API."""
        try:
            resp = await client.get(
                f"{self.base_url}/api/v1/users/current",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("email", ""), data.get("id")
        except Exception:
            pass
        return "", None


class VillageEnvManager:
    """Manages multiple Village environments and per-session environment selection.

    Each environment has its own VillageTokenStore (with independent OAuth
    credentials and base_url). Sessions are bound to an active environment
    so the agent uses the correct tokens.
    """

    def __init__(self) -> None:
        self._envs: dict[str, tuple[VillageTokenStore, str]] = {}  # name -> (store, base_url)
        self._active: dict[str, str] = {}  # session_key -> env_name

    def add_env(self, name: str, base_url: str, client_id: str, client_secret: str) -> None:
        store = VillageTokenStore(
            base_url=base_url,
            client_id=client_id,
            client_secret=client_secret,
        )
        self._envs[name] = (store, base_url)

    @property
    def env_names(self) -> list[str]:
        return list(self._envs.keys())

    def get_store(self, env_name: str) -> VillageTokenStore | None:
        env = self._envs.get(env_name)
        return env[0] if env else None

    def get_base_url(self, env_name: str) -> str | None:
        env = self._envs.get(env_name)
        return env[1] if env else None

    # ── Per-session active environment ────────────────────────────────

    def set_active(self, session_key: str, env_name: str) -> None:
        self._active[session_key] = env_name

    def get_active(self, session_key: str) -> str | None:
        return self._active.get(session_key)

    def get_active_store(self, session_key: str) -> VillageTokenStore | None:
        env_name = self._active.get(session_key)
        return self.get_store(env_name) if env_name else None

    def get_active_base_url(self, session_key: str) -> str | None:
        env_name = self._active.get(session_key)
        return self.get_base_url(env_name) if env_name else None

    def clear_active(self, session_key: str) -> None:
        self._active.pop(session_key, None)
