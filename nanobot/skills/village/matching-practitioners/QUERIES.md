# Matchmaking Investigation Queries

Reference queries for the read-only Rails console. All use `nanobot_console.sh`.

## Compass Search Lookup

Find a previous search by slug:

```
'q = AiMatchmakingQuery.find_by!(slug: "SLUG"); r = q.result; puts JSON.pretty_generate({ input: q.user_input_text, created: q.created_at, eligible_count: r&.eligible_count, recommendation_count: r&.recommended_count, ai_message: r&.ai_message, criteria: r&.eligibility_criteria, recommendations: r&.recommendations })'
```

List a user's recent searches:

```
'AiMatchmakingQuery.where(created_by_user_id: USER_ID).order(created_at: :desc).limit(10).pluck(:slug, :user_input_text, :created_at)'
```

## Match Request Investigation

Look up a match request with context:

```
'mr = MatchRequest.find(ID); puts JSON.pretty_generate({ id: mr.id, status: mr.status, patient: mr.patient&.name, caregiver: mr.caregiver&.user&.name, practitioner: mr.organization_participant.practitioner.user.name, organization: mr.organization_participant.organization.name, contact_type: mr.contact_type, times_requested: mr.times_requested, created_at: mr.created_at, accepted_at: mr.accepted_at, notes: mr.initial_request_notes&.truncate(500), compass_slug: mr.ai_matchmaking_query&.slug })'
```

Stale match requests (in review for more than N days):

```
'MatchRequest.where(status: "review").where("created_at < ?", 5.days.ago).includes(:patient, organization_participant: [:practitioner, :organization]).map { |mr| { id: mr.id, days_old: ((Time.current - mr.created_at) / 1.day).round, patient: mr.patient&.name, practitioner: mr.organization_participant.practitioner.user.name, org: mr.organization_participant.organization.name } }'
```

Match requests by status for an organization:

```
'MatchRequest.joins(organization_participant: :organization).where(organizations: { id: ORG_ID }).group(:status).count'
```

## Practitioner Queries

Find practitioners by specialization name:

```
'Practitioner.joins(:specializations).where(specializations: { name: "Speech-Language Pathology" }).includes(:user, :license_type).map { |p| { id: p.id, name: p.user.name, license: p.license_type&.name, state: p.primary_license_state, marketplace_status: p.marketplace_status } }'
```

Practitioners in a geographic area (by state):

```
'OrganizationParticipant.marketplace_eligible.joins(practitioner: :user).where(practitioners: { primary_license_state: "CA" }).includes(practitioner: [:user, :specializations, :languages], organization: []).map { |op| { op_id: op.id, name: op.practitioner.user.name, specializations: op.practitioner.specializations.pluck(:name), languages: op.practitioner.languages.pluck(:name), insurances: op.accepted_insurances, accepting: op.accepting_patients } }'
```

List all specializations:

```
'Specialization.where(is_active: true).order(:name).pluck(:id, :name)'
```

List all license types:

```
'LicenseType.order(:name).pluck(:id, :name)'
```

## Availability

Marketplace availability for a practitioner:

```
'MarketplaceAvailability.where(organization_participant_id: OP_ID).where("end_time_utc > ?", Time.current).order(:start_time_utc).limit(20).map { |a| { day: Date::DAYNAMES[a.day_of_week], start: a.start_time_utc.strftime("%I:%M %p"), end_time: a.end_time_utc.strftime("%I:%M %p"), type: a.appointment_type_name, contact: a.contact_type } }'
```

Practitioners with evening availability (after 5pm PT) in a state:

```
'OrganizationParticipant.marketplace_eligible.joins(practitioner: :user).where(practitioners: { primary_license_state: "CA" }).joins("INNER JOIN marketplace_availabilities ma ON ma.organization_participant_id = organization_participants.id").where("ma.end_time_utc > ?", Time.current).where("EXTRACT(HOUR FROM ma.start_time_utc AT TIME ZONE $$America/Los_Angeles$$) >= 17").distinct.includes(practitioner: [:user, :specializations]).map { |op| { name: op.practitioner.user.name, specializations: op.practitioner.specializations.pluck(:name) } }'
```

## Marketplace Supply Analysis

Eligible practitioners by specialization:

```
'OrganizationParticipant.marketplace_eligible.joins(practitioner: :specializations).group("specializations.name").count.sort_by { |_, v| -v }'
```

Eligible practitioners by state:

```
'OrganizationParticipant.marketplace_eligible.joins(:practitioner).group("practitioners.primary_license_state").count.sort_by { |_, v| -v }'
```

Organizations with marketplace-eligible practitioners:

```
'Organization.joins(:organization_participants).merge(OrganizationParticipant.marketplace_eligible).distinct.pluck(:id, :name)'
```

## Compass Analytics

Recent Compass searches with zero results:

```
'AiMatchmakingQuery.joins(:result).where(ai_matchmaking_results: { recommended_count: 0 }).order(created_at: :desc).limit(10).map { |q| { slug: q.slug, input: q.user_input_text.truncate(120), criteria: q.result.eligibility_criteria, created: q.created_at } }'
```

Compass conversion funnel (last 30 days):

```
'queries = AiMatchmakingQuery.where("created_at > ?", 30.days.ago); with_results = queries.joins(:result).where("ai_matchmaking_results.recommended_count > 0"); with_bookings = queries.joins(:match_requests); confirmed = queries.joins(:match_requests).where(match_requests: { status: ["confirmed", "enrolled"] }); { total_searches: queries.count, with_recommendations: with_results.count, with_bookings: with_bookings.distinct.count, confirmed: confirmed.distinct.count }'
```

## Debugging Zero-Result Searches

Check what eligibility criteria were extracted:

```
'r = AiMatchmakingQuery.find_by!(slug: "SLUG").result; puts JSON.pretty_generate(r.eligibility_criteria)'
```

Count marketplace-eligible practitioners (total baseline):

```
'OrganizationParticipant.marketplace_eligible.count'
```

Check if any practitioners match specific criteria:

```
'OrganizationParticipant.marketplace_eligible.joins(:practitioner).where(practitioners: { primary_license_state: "MT" }).count'
```

Check insurance availability:

```
'OrganizationParticipant.marketplace_eligible.where("? = ANY(accepted_insurances)", "anthem_blue_cross").count'
```

List all insurance keys in use:

```
'OrganizationParticipant.marketplace_eligible.pluck(:accepted_insurances).flatten.tally.sort_by { |_, v| -v }'
```
