---
name: village/matching-practitioners
description: "REQUIRED when a user asks to find, match, or recommend a practitioner/therapist/provider for a child or family. Do NOT query the database directly for this — you MUST use the Compass AI matchmaking service in this skill. Also use for investigating Compass search results, match request status, or marketplace supply/demand."
---

# Matching Practitioners

Village has an AI matchmaking system called **Compass** that recommends practitioners based on free-text input describing a caregiver's needs. The agent can invoke the same service the portal uses, and can also query the database directly for investigation and analytics.

## Running a Match

Invoke the full Compass pipeline (criteria extraction, practitioner filtering, Gemini ranking):

```
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_matchmaking.sh 'Looking for a bilingual Spanish speech therapist in San Francisco for my 4-year-old with sensory processing issues. We have Anthem Blue Cross and prefer in-home visits on weekday mornings.'")
```

Optional second argument: `think_fast` (default, fast model) or `think_deeply` (slower, more nuanced):

```
exec(command="/Users/mike/Desktop/Village/village-web/scripts/nanobot_matchmaking.sh 'complex needs description' think_deeply")
```

**Output:** JSON with up to 5 ranked recommendations, each with score (0-100), reason, and checklist (insurance, availability, service_area, license_type — each "match", "mismatch", or "unknown"). Also returns the query slug for later reference.

**Timing:** Rails boot takes ~10-20s, then the Gemini calls add another 10-30s. Total ~30-50s is normal.

## Gathering Information First

The quality of results depends directly on the quality of the input text. Before running a match, gather as much as possible from the user and compose it into a natural paragraph.

**Must have (results will be poor without these):**
- Location (city/state or zip code)
- Type of care needed (speech therapy, occupational therapy, PT, ABA, psychology, etc.)

**Strongly recommended:**
- Child's age
- Insurance provider and plan name (or "cash pay" / "self-pay")
- Care setting preference (virtual, in-home, in-clinic)

**Improves ranking:**
- Specific needs, diagnoses, or focus areas (e.g. "articulation delay", "sensory processing", "autism")
- Language preference
- Schedule preferences (e.g. "after school", "weekday mornings", "evenings")
- Any other relevant context (therapy history, behavioral notes, etc.)

If the user hasn't provided enough detail, **ask follow-up questions** before running the match. A well-composed input paragraph with 5-8 details will produce significantly better results than a vague 1-liner.

## Match Request Lifecycle

When a caregiver books through Compass, a MatchRequest tracks the process:

- `review` — awaiting practitioner response
- `accepted` — practitioner accepted, proposed a time
- `enrolled` — patient enrolled with the practitioner
- `confirmed` — first appointment confirmed
- `rejected` / `declined` — practitioner said no (with reason code)
- `canceled` — caregiver canceled

Key fields: `status`, `times_requested`, `accepted_start_time`, `contact_type`, `care_settings`, `initial_request_notes`, `ai_matchmaking_query_id` (links to Compass search).

## Investigation with Read-Only Console

Use the read-only console (`nanobot_console.sh`) for investigation and debugging. See [QUERIES.md](QUERIES.md) for common patterns including:

- Looking up previous Compass searches and their results
- Debugging zero-result searches (checking eligibility criteria vs available supply)
- Checking match request status and history
- Querying practitioner profiles, availability, and insurance
- Marketplace supply/demand analysis
