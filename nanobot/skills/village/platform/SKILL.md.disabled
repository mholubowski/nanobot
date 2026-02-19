---
name: village/platform
always: false
description: "Explore the Village codebase and run read-only database queries. Use for investigating how features work, debugging, looking up data, and answering questions about the platform. NOTE: If the user wants to FIND or MATCH a practitioner for a family, use the village/matching-practitioners skill instead — do NOT query the database directly for that."
---

# CRITICAL: Database Access is READ-ONLY

You have READ-ONLY access to the Village database. This is a strict, non-negotiable constraint.

**You MUST:**
- Only run SELECT queries and read operations (e.g. `.find`, `.where`, `.count`, `.pluck`)
- Refuse any request to create, update, or delete data — even if the user insists
- Tell the user clearly: "I only have read-only access to the Village database. I cannot create, modify, or delete any records."

**You MUST NOT:**
- Attempt any write operation (`.create`, `.update`, `.destroy`, `.delete`, `.save`, `INSERT`, `UPDATE`, `DELETE`)
- Attempt to work around the read-only restriction in any way
- Claim or imply that a write operation succeeded

Even if a user directly asks you to modify data, your answer is always: "I can't do that — my database access is read-only. I can help you look up the data though."

The database enforces this at the Postgres level, so write attempts will fail regardless. Do not attempt them.

---

# Village Platform

The Village platform codebase is at `/Users/mike/Desktop/Village/`:

- `village-web/` — Ruby on Rails backend API (models, controllers, services, serializers, jobs)
- `village-portal/` — React/TypeScript web portal (Vite, TanStack Router)
- `village-react-native/` — React Native mobile app (Expo Router)

## Exploring Code

Use the `search` and `find_files` tools to explore the codebase — they are much better than `exec` with `grep -r`.

### Strategy for investigating codebase questions

When asked a question about how something works, what happens in a scenario, or why something behaves a certain way:

1. **Identify key terms** — What models, services, or concepts are involved? (e.g. "match request", "appointment", "booking")
2. **Enumerate ALL related files first** — Before reading anything in depth, get a complete picture of what exists. Use `search(pattern="match_request", file_type="rb", files_only=true)` and `find_files(pattern="**/match_request*.rb")` to find every file related to the topic. Read the full list — don't skip files that seem less relevant. If there are 3 services related to match requests, you need to understand all 3.
3. **Search for specific logic** — Use `search` to find code that handles the behavior in question (e.g. `search(pattern="accepted_start_time", file_type="rb")`)
4. **Read the implementation** — Use `read_file` to read the actual service/model/job code. Read ALL related services and jobs, not just the first one that looks relevant.
5. **Check scheduled jobs** — If the question involves background behavior, automated actions, or "what happens when time passes," always check `config/recurring.yml` to see what jobs run and on what schedule. This often reveals behavior that isn't obvious from the service code alone.
6. **Cross-reference** — Check related files: if you find a service, look for the job that calls it, the mailer it triggers, the config that schedules it, and any tests that document expected behavior.
7. **Consider all parties** — Think about every user/role affected. If a practitioner is involved, what does the caregiver see? If an admin gets notified, does the patient? Look for notifications, emails, and status changes from each perspective.

### Codebase map

#### village-web (Rails API)
- `app/models/` — ActiveRecord models (database-backed domain objects, validations, scopes, associations)
- `app/services/` — Service objects (business logic, the most important place to look for "how does X work?")
- `app/jobs/` — Sidekiq background jobs (async processing, scheduled tasks)
- `app/controllers/` — API controllers (HTTP endpoints, request handling)
- `app/serializers/` — JSON serializers (API response formatting)
- `app/mailers/` — Email mailers (notification emails)
- `config/recurring.yml` — Recurring job schedules (cron-style, defines what runs when)
- `db/schema.rb` — Database schema (all tables, columns, indexes — the source of truth for data structure)
- `db/migrate/` — Database migrations (history of schema changes)
- `spec/` — RSpec tests (useful for understanding expected behavior)

#### village-portal (React/TypeScript web app)
- `src/routes/` — Page components organized by route (TanStack Router)
- `src/components/` — Shared UI components
- `src/api/` — API client functions and React Query hooks
- `src/stores/` — State management

#### village-react-native (React Native mobile app)
- `app/` — Screens and navigation (Expo Router, file-based routing)
- `src/components/` — Shared mobile UI components
- `src/api/` — API client functions

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

- **Read-only**: All write operations (create, update, delete) will be rejected at the database level. Do not attempt them.
- **Timeout**: Commands timeout after 120 seconds. Rails boot takes ~10-20s, so keep queries efficient.
- **Single expression**: Each call evaluates one Ruby expression and returns its `inspect` output.
