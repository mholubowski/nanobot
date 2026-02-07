"""Code search tools: ripgrep search and file finder."""

import asyncio
import shutil
from pathlib import Path
from typing import Any

from nanobot.agent.tools.base import Tool


class SearchTool(Tool):
    """Tool to search code using ripgrep."""

    def __init__(self, workspace: Path, timeout: int = 30):
        self._workspace = workspace
        self._timeout = timeout
        # Resolve full path to rg at init time so subprocess_exec can find it
        # even when PATH doesn't include Homebrew (common on macOS)
        self._rg_path = shutil.which("rg")

    @property
    def name(self) -> str:
        return "search"

    @property
    def description(self) -> str:
        return (
            "Search for a regex pattern across files using ripgrep. "
            "Returns matching lines with file paths, line numbers, and surrounding context. "
            "Use files_only=true to get just the list of files that match (great for discovery). "
            "Much faster and more useful than `exec` with `grep` — prefer this for code search."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern to search for (e.g. 'match_request.*status', 'def create', 'class MatchRequest')"
                },
                "path": {
                    "type": "string",
                    "description": "Directory or file to search in. Defaults to the workspace root if not provided."
                },
                "file_type": {
                    "type": "string",
                    "description": "Filter by file type: rb, py, ts, tsx, js, jsx, json, yml, md, etc."
                },
                "context_lines": {
                    "type": "integer",
                    "description": "Number of context lines to show around each match (default: 3)"
                },
                "files_only": {
                    "type": "boolean",
                    "description": "If true, return only file paths that contain matches (no content). Useful for discovery — find ALL files related to a topic before reading them."
                },
            },
            "required": ["pattern"],
        }

    async def execute(
        self,
        pattern: str,
        path: str | None = None,
        file_type: str | None = None,
        context_lines: int = 3,
        files_only: bool = False,
        **kwargs: Any,
    ) -> str:
        if not self._rg_path:
            return "Error: ripgrep (rg) is not installed. Install it with: brew install ripgrep"

        search_path = path or str(self._workspace)

        if files_only:
            cmd = [
                self._rg_path,
                "--files-with-matches",
                "--color=never",
            ]
        else:
            cmd = [
                self._rg_path,
                "--no-heading",
                "--line-number",
                f"--context={context_lines}",
                "--max-count=20",        # max matches per file
                "--max-columns=200",     # truncate very long lines
                "--max-columns-preview",
                "--color=never",
            ]

        if file_type:
            cmd.extend(["--type", file_type])

        cmd.append("--")
        cmd.append(pattern)
        cmd.append(search_path)

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self._timeout,
                )
            except asyncio.TimeoutError:
                process.kill()
                return f"Error: Search timed out after {self._timeout} seconds. Try a more specific pattern or narrower path."

            if process.returncode == 1:
                return f"No matches found for pattern: {pattern}"

            if process.returncode == 2:
                err = stderr.decode("utf-8", errors="replace").strip()
                return f"Error: {err}"

            result = stdout.decode("utf-8", errors="replace")

            # Truncate at 30k chars (3x the exec tool limit)
            max_len = 30000
            if len(result) > max_len:
                result = result[:max_len] + f"\n\n... (truncated, {len(result) - max_len} more chars. Narrow your search with a more specific pattern or path.)"

            return result

        except FileNotFoundError:
            return "Error: ripgrep (rg) is not installed. Install it with: brew install ripgrep"
        except Exception as e:
            return f"Error running search: {str(e)}"


class FindFilesTool(Tool):
    """Tool to find files by name pattern."""

    def __init__(self, workspace: Path):
        self._workspace = workspace

    @property
    def name(self) -> str:
        return "find_files"

    @property
    def description(self) -> str:
        return (
            "Find files by name/glob pattern. "
            "Returns matching file paths. "
            "Useful for discovering relevant files before reading them "
            "(e.g. find_files(pattern='**/match_request*.rb') to find all match request related Ruby files)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Glob pattern to match file names (e.g. '**/match_request*.rb', '**/*service*.rb', '*.yml')"
                },
                "path": {
                    "type": "string",
                    "description": "Directory to search in. Defaults to the workspace root if not provided."
                },
            },
            "required": ["pattern"],
        }

    async def execute(
        self,
        pattern: str,
        path: str | None = None,
        **kwargs: Any,
    ) -> str:
        search_dir = Path(path) if path else self._workspace

        if not search_dir.exists():
            return f"Error: Directory not found: {search_dir}"
        if not search_dir.is_dir():
            return f"Error: Not a directory: {search_dir}"

        try:
            matches = sorted(search_dir.glob(pattern))

            # Filter out hidden dirs and common noise
            skip = {".git", "node_modules", "__pycache__", ".next", "dist", "build", "vendor/bundle"}
            filtered = []
            for m in matches:
                parts = set(m.relative_to(search_dir).parts)
                if not parts & skip and m.is_file():
                    filtered.append(m)

            if not filtered:
                return f"No files found matching pattern: {pattern}"

            cap = 100
            lines = [str(f) for f in filtered[:cap]]

            result = f"Found {len(filtered)} file(s):\n\n" + "\n".join(lines)
            if len(filtered) > cap:
                result += f"\n\n... and {len(filtered) - cap} more. Use a more specific pattern to narrow results."

            return result

        except Exception as e:
            return f"Error finding files: {str(e)}"
