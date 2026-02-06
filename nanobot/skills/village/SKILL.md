---
name: village
description: Access and query the Village healthcare platform. Use when asked about Village, its codebase, database, patients, practitioners, organizations, workspaces, or any healthcare platform questions. Provides read-only Rails console access and codebase exploration across village-web (Rails API), village-portal (React web), and village-react-native (React Native mobile).
---

# Village Platform

The Village platform codebase is at `/Users/mike/Desktop/Village/`:

- `village-web/` — Ruby on Rails backend API (models, controllers, services, serializers, jobs)
- `village-portal/` — React/TypeScript web portal (Vite, TanStack Router)
- `village-react-native/` — React Native mobile app (Expo Router)

## Exploring Code

Use `read_file` and `list_dir` to explore any of the three repos. When investigating a topic, start with the directory structure, then drill into relevant files. Use `exec` with `grep -r` for searching across files.

## Running Database Queries

Use the read-only Rails console wrapper to query the database:

```
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.count'")
```

The wrapper connects with a read-only Postgres user (SELECT only) and sets `default_transaction_read_only = on`. It accepts any Ruby/Rails expression and returns the result.

### Examples

```
# Count records
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.count'")

# Find a record
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.find(1).attributes'")

# Query with conditions
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.where(role: :admin).pluck(:email)'")

# Inspect model associations
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.reflect_on_all_associations.map(&:name)'")

# Check table columns
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_console.sh 'User.column_names'")
```

### Limitations

- **Read-only**: All write operations (create, update, delete) will be rejected at the database level.
- **Timeout**: Commands timeout after 120 seconds. Rails boot takes ~10-20s, so keep queries efficient.
- **Single expression**: Each call evaluates one Ruby expression and returns its `inspect` output.
