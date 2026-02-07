# Available Tools

This document describes the tools available to nanobot.

## File Operations

### read_file
Read the contents of a file.
```
read_file(path: str) -> str
```

### write_file
Write content to a file (creates parent directories if needed).
```
write_file(path: str, content: str) -> str
```

### edit_file
Edit a file by replacing specific text.
```
edit_file(path: str, old_text: str, new_text: str) -> str
```

### list_dir
List contents of a directory.
```
list_dir(path: str) -> str
```

## Code Search

### search
Search for a regex pattern across files using ripgrep. Returns matching lines with file paths, line numbers, and surrounding context. **Prefer this over `exec` with `grep`** — it's faster, returns better output, and has a higher output limit (30k chars vs 10k).
```
search(pattern: str, path: str = None, file_type: str = None, context_lines: int = 3, files_only: bool = False) -> str
```

**Parameters:**
- `pattern` — Regex pattern (e.g. `"match_request.*status"`, `"def create"`, `"class MatchRequest"`)
- `path` — Directory or file to search in (defaults to workspace root)
- `file_type` — Filter by type: `rb`, `py`, `ts`, `tsx`, `js`, `json`, `yml`, `md`, etc.
- `context_lines` — Lines of context around each match (default: 3)
- `files_only` — If true, return only file paths that match (no content). Great for discovery — see ALL files related to a topic before diving into any of them.

**Examples:**
```
# Discovery: find ALL files that mention match_request
search(pattern="match_request", file_type="rb", files_only=true)

# Detailed: search with context
search(pattern="class MatchRequest", file_type="rb")
search(pattern="def perform", path="/Users/mike/Desktop/Village/village-web/app/jobs")
search(pattern="accepted_start_time", file_type="rb", context_lines=5)
```

### find_files
Find files by name/glob pattern. Useful for discovering relevant files before reading them.
```
find_files(pattern: str, path: str = None) -> str
```

**Parameters:**
- `pattern` — Glob pattern (e.g. `"**/match_request*.rb"`, `"**/*service*.rb"`, `"*.yml"`)
- `path` — Directory to search in (defaults to workspace root)

**Examples:**
```
find_files(pattern="**/match_request*.rb")
find_files(pattern="**/*_service.rb", path="/Users/mike/Desktop/Village/village-web/app/services")
find_files(pattern="**/recurring.yml")
```

## Shell Execution

### exec
Execute a shell command and return output.
```
exec(command: str, working_dir: str = None) -> str
```

**Safety Notes:**
- Commands have a configurable timeout (default 60s)
- Dangerous commands are blocked (rm -rf, format, dd, shutdown, etc.)
- Output is truncated at 10,000 characters
- Optional `restrictToWorkspace` config to limit paths

## Web Access

### web_search
Search the web using Brave Search API.
```
web_search(query: str, count: int = 5) -> str
```

Returns search results with titles, URLs, and snippets. Requires `tools.web.search.apiKey` in config.

### web_fetch
Fetch and extract main content from a URL.
```
web_fetch(url: str, extractMode: str = "markdown", maxChars: int = 50000) -> str
```

**Notes:**
- Content is extracted using readability
- Supports markdown or plain text extraction
- Output is truncated at 50,000 characters by default

## Communication

### message
Send a message to the user (used internally).
```
message(content: str, channel: str = None, chat_id: str = None) -> str
```

## Background Tasks

### spawn
Spawn a subagent to handle a task in the background.
```
spawn(task: str, label: str = None) -> str
```

Use for complex or time-consuming tasks that can run independently. The subagent will complete the task and report back when done.

## Scheduled Reminders (Cron)

Use the `exec` tool to create scheduled reminders with `nanobot cron add`:

### Set a recurring reminder
```bash
# Every day at 9am
nanobot cron add --name "morning" --message "Good morning! ☀️" --cron "0 9 * * *"

# Every 2 hours
nanobot cron add --name "water" --message "Drink water! 💧" --every 7200
```

### Set a one-time reminder
```bash
# At a specific time (ISO format)
nanobot cron add --name "meeting" --message "Meeting starts now!" --at "2025-01-31T15:00:00"
```

### Manage reminders
```bash
nanobot cron list              # List all jobs
nanobot cron remove <job_id>   # Remove a job
```

## Heartbeat Task Management

The `HEARTBEAT.md` file in the workspace is checked every 30 minutes.
Use file operations to manage periodic tasks:

### Add a heartbeat task
```python
# Append a new task
edit_file(
    path="HEARTBEAT.md",
    old_text="## Example Tasks",
    new_text="- [ ] New periodic task here\n\n## Example Tasks"
)
```

### Remove a heartbeat task
```python
# Remove a specific task
edit_file(
    path="HEARTBEAT.md",
    old_text="- [ ] Task to remove\n",
    new_text=""
)
```

### Rewrite all tasks
```python
# Replace the entire file
write_file(
    path="HEARTBEAT.md",
    content="# Heartbeat Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n"
)
```

---

## Adding Custom Tools

To add custom tools:
1. Create a class that extends `Tool` in `nanobot/agent/tools/`
2. Implement `name`, `description`, `parameters`, and `execute`
3. Register it in `AgentLoop._register_default_tools()`
