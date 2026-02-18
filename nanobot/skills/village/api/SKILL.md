---
name: village/api
description: Make authenticated requests to Village's REST API as the connected user.
always: true
metadata: {"nanobot":{"emoji":"🏥"}}
---

# Village REST API

Use the `village_api` tool to make authenticated HTTP requests to Village's REST API. All requests are made as the currently connected Village user — their permissions, roles, and access are inherited automatically via OAuth.

## CRITICAL: Always use the tool

NEVER claim to have read or written Village data without actually calling `village_api`. Do not fabricate API responses. Every interaction with Village MUST go through the tool — call it, wait for the real response, and report what the API actually returned. If the call fails, report the real error.

## When to use

- The user asks you to read or write data in Village (patients, appointments, organizations, workspaces, etc.)
- The user asks about their patients, schedule, team, billing, insurance, or any Village-managed data
- The user wants to perform administrative actions (invite members, manage roles, etc.)

## Connection requirement

The user **must** first click "Connect to Village" in the sidebar. If the `village_api` tool returns a "not connected" error, ask the user to connect first.

## How to use the tool

```
village_api(method="GET", path="/api/v1/patients", params={"page": 1})
village_api(method="POST", path="/api/v1/appointments/practitioner_create", body={...})
```

**Parameters:**
- `method`: GET, POST, PUT, PATCH, or DELETE
- `path`: Always starts with `/api/v1/`
- `body`: JSON body for POST/PUT/PATCH (optional)
- `params`: URL query parameters (optional)

## API categories overview

| Category | Common paths | Use for |
|----------|-------------|---------|
| Users | `/api/v1/users/current` | Current user profile, permissions |
| Patients | `/api/v1/patients` | Patient records, basic info, team members |
| Appointments | `/api/v1/appointments/practitioner_index` | Scheduling, appointment management |
| Organizations | `/api/v1/organizations` | Org settings, members, billing |
| Workspaces | `/api/v1/workspaces` | Workspace details, patient summaries |
| Match Requests | `/api/v1/match_requests/...` | Referral matching, meet & greets |
| Chat | `/api/v1/chat_channels` | HIPAA-compliant messaging |
| Insurance | `/api/v1/organizations/:org_id/patients/:patient_id/insurance_policies` | Insurance policies, benefits checks |
| Clinical Notes | `/api/v1/clinical_note_forms` | EHR documentation |
| Marketplace | `/api/v1/marketplace/practitioners` | Provider discovery |
| Exercises | `/api/v1/exercises` | Home exercise programs |
| Referrals | `/api/v1/referrals` | Practitioner-to-practitioner referrals |

## Key patterns

1. **Start with the current user** — `GET /api/v1/users/current` to understand who you're acting as and what they can access.
2. **Practitioner vs Caregiver endpoints** — Many resources have separate practitioner and caregiver variants (e.g. `practitioner_index` vs `caregiver_index`).
3. **Organization-scoped resources** — Some endpoints require an organization ID in the path: `/api/v1/organizations/:org_id/...`
4. **Workspace-scoped resources** — Workspaces are shared care spaces for a patient. Use `/api/v1/workspaces` to discover them.
5. **Pagination** — List endpoints support `page` and `per_page` query params.

## Full endpoint reference

For the complete list of all 300+ endpoints with paths, methods, parameters, and descriptions, read the reference file:

```
read_file(path="nanobot/skills/village/api/ENDPOINTS.md")
```

Always consult this reference when you need the exact path, required params, or body format for an endpoint you haven't used before.
