# Village API Endpoint Reference

Complete reference for all Village REST API endpoints (`/api/v1/`).
All endpoints require authentication via OAuth Bearer token (handled automatically by `village_api`).

---

## Authentication & Users

### Current User
- `GET /api/v1/users/current` — Get current authenticated user (profile, roles, permissions)
- `GET /api/v1/users/my_portal_permissions` — Get feature flags and portal permissions

### User Management
- `GET /api/v1/users` — List users
- `GET /api/v1/users/:id` — Get user by ID
- `POST /api/v1/users` — Create user
- `PUT /api/v1/users` — Update current user's profile
- `PUT /api/v1/users/:id` — Update user by ID (admin)
- `DELETE /api/v1/users/:id` — Delete user
- `POST /api/v1/users/update_profile_picture` — Update avatar (multipart)
- `PATCH /api/v1/users/complete_onboarding` — Mark onboarding complete

### Auth
- `POST /api/v1/auth/sign_in` — Sign in (email, password)
- `DELETE /api/v1/auth/sign_out` — Sign out
- `GET /api/v1/auth/validate_token` — Validate current token

---

## Patients

### Patient CRUD
- `GET /api/v1/patients` — List patients (supports filtering)
- `GET /api/v1/patients/:id` — Get patient details
- `POST /api/v1/patients` — Create caregiver-managed patient
  - Body: `{ patient: { first_name, last_name, date_of_birth, ... } }`
- `POST /api/v1/patients/practitioner` — Create practitioner-managed patient
- `PUT /api/v1/patients/:id` — Update patient
- `DELETE /api/v1/patients/:id` — Delete patient

### Patient Info
- `GET /api/v1/patients/:id/basic_info` — Basic patient info
- `GET /api/v1/patients/:id/access` — Check access permissions
- `GET /api/v1/patients/:id/team_members` — Unified team members list
- `GET /api/v1/patients/:id/appointment_readiness` — Appointment readiness data
- `POST /api/v1/patients/appointment_readiness_batch` — Batch appointment readiness
- `GET /api/v1/patients/:id/check_duplicates` — Check for duplicate patients
- `POST /api/v1/patients/:id/update_avatar` — Update patient avatar
- `PATCH /api/v1/patients/:id/billing_preference` — Set billing preference
- `PATCH /api/v1/patients/:id/auto_pay_billing` — Set auto-pay billing
- `POST /api/v1/patients/:id/admission_details` — Save admission details

### Patient Caregivers
- `GET /api/v1/patients/:patient_id/caregivers` — List caregivers
- `POST /api/v1/patients/:patient_id/caregivers` — Add caregiver
- `GET /api/v1/patients/:patient_id/caregivers/:id` — Get caregiver
- `PUT /api/v1/patients/:patient_id/caregivers/:id` — Update caregiver relationship
- `DELETE /api/v1/patients/:patient_id/caregivers/:id` — Remove caregiver
- `GET /api/v1/caregivers/relationship_types` — List relationship type options

### Patient Files & Folders
- `GET /api/v1/patients/:patient_id/folders` — List folders
- `POST /api/v1/patients/:patient_id/folders` — Create folder
- `GET /api/v1/patients/:patient_id/folders/:id` — Get folder
- `PUT /api/v1/patients/:patient_id/folders/:id` — Update folder
- `DELETE /api/v1/patients/:patient_id/folders/:id` — Delete folder
- `GET /api/v1/patients/:patient_id/files` — List files
- `POST /api/v1/patients/:patient_id/files` — Upload file
- `GET /api/v1/patients/:patient_id/files/:id` — Get file
- `PUT /api/v1/patients/:patient_id/files/:id` — Update file
- `DELETE /api/v1/patients/:patient_id/files/:id` — Delete file
- `PUT /api/v1/patients/:patient_id/files/signed_url` — Get signed upload URL

### Patient Goals
- `GET /api/v1/patients/:patient_id/goals` — List goals
- `POST /api/v1/patients/:patient_id/goals` — Create goal
- `GET /api/v1/patients/:patient_id/goals/:id` — Get goal
- `PUT /api/v1/patients/:patient_id/goals/:id` — Update goal
- `DELETE /api/v1/patients/:patient_id/goals/:id` — Delete goal
- `POST /api/v1/patients/:patient_id/goals/:id/add_exercise` — Add exercise to goal

### Patient Insurance Policies (Practitioner-scoped)
- `GET /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies` — List policies
- `POST /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies` — Create policy
- `PUT /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/:id` — Update policy
- `DELETE /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/:id` — Delete policy
- `POST /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/:id/benefits_check` — Create benefits check
- `POST /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/:id/silna_eligibility_check` — Run eligibility check
- `GET /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/:id/silna_eligibility_check` — Get eligibility status
- `POST /api/v1/organizations/:org_id/patients/:patient_id/insurance_policies/extract_ocr_from_upload` — OCR insurance card

### Patient Insurance Policies (Caregiver-scoped)
- `GET /api/v1/patients/:patient_id/insurance_policies/caregiver` — List policies
- `POST /api/v1/patients/:patient_id/insurance_policies/caregiver` — Create policy
- `PATCH /api/v1/patients/:patient_id/insurance_policies/:id/caregiver` — Update policy
- `DELETE /api/v1/patients/:patient_id/insurance_policies/:id/caregiver` — Delete policy
- `POST /api/v1/patients/:patient_id/insurance_policies/:id/caregiver_realtime_eligibility_check` — Run realtime eligibility
- `GET /api/v1/patients/:patient_id/insurance_policies/:id/plan_status` — Get plan status

### Patient Payment Methods (Caregiver-scoped)
- `GET /api/v1/patients/:patient_id/payment_methods` — List payment methods
- `GET /api/v1/patients/:patient_id/payment_methods/caregiver_marketplace_payment_method` — Get marketplace payment method
- `GET /api/v1/patients/:patient_id/payment_methods/eligible_caregivers` — Eligible caregivers for payment
- `POST /api/v1/patients/:patient_id/payment_methods/caregiver_setup_intent` — Create Stripe setup intent
- `POST /api/v1/patients/:patient_id/payment_methods/caregiver_create_from_setup_intent` — Create from setup intent
- `DELETE /api/v1/patients/:patient_id/payment_methods/caregiver_destroy` — Delete payment method
- `POST /api/v1/patients/:patient_id/payment_methods/setup_intents` — Create setup intents for workspace
- `POST /api/v1/patients/:patient_id/payment_methods/bulk_create_from_setup_intents` — Bulk create
- `POST /api/v1/patients/:patient_id/payment_methods/set_group_primary` — Set group primary
- `DELETE /api/v1/patients/:patient_id/payment_methods/bulk_destroy` — Bulk delete

### Patient Payment Methods (Practitioner-scoped)
- `GET /api/v1/organizations/:org_id/patients/:patient_id/payment_methods` — List payment methods
- `POST /api/v1/organizations/:org_id/patients/:patient_id/payment_methods/create_setup_intent` — Create setup intent
- `POST /api/v1/organizations/:org_id/patients/:patient_id/payment_methods/create_from_setup_intent` — Create from setup intent
- `POST /api/v1/organizations/:org_id/patients/:patient_id/payment_methods/:id/set_primary` — Set primary
- `DELETE /api/v1/organizations/:org_id/patients/:patient_id/payment_methods/:id` — Delete

### Patient Invoices
- `GET /api/v1/patients/:patient_id/invoices/caregiver_index` — List invoices (caregiver view)
- `GET /api/v1/patients/:patient_id/invoices/practitioner_index` — List invoices (practitioner view)
- `GET /api/v1/patients/:patient_id/payments` — List payments

### Patient Intake Forms
- `GET /api/v1/patients/:patient_id/patient_intake_forms/:id` — Get intake form
- `POST /api/v1/patients/:patient_id/patient_intake_forms/upsert` — Create/update intake form

### AI Goal Conversations
- `GET /api/v1/patients/:patient_id/ai_goal_conversations` — List AI goal conversations
- `POST /api/v1/patients/:patient_id/ai_goal_conversations` — Create conversation
- `GET /api/v1/patients/:patient_id/ai_goal_conversations/:id` — Get conversation
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/send_message` — Send message
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/complete` — Complete
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/abandon` — Abandon
- `GET /api/v1/patients/:patient_id/ai_goal_conversations/sample_prompts` — Sample prompts

### Referring Physicians
- `GET /api/v1/patients/:patient_id/referring_physicians` — List
- `POST /api/v1/patients/:patient_id/referring_physicians` — Create
- `PUT /api/v1/patients/:patient_id/referring_physicians/:id` — Update
- `DELETE /api/v1/patients/:patient_id/referring_physicians/:id` — Delete

### Diagnoses (Organization-scoped)
- `GET /api/v1/organizations/:org_id/patients/:patient_id/diagnoses` — List
- `POST /api/v1/organizations/:org_id/patients/:patient_id/diagnoses` — Create
- `PUT /api/v1/organizations/:org_id/patients/:patient_id/diagnoses/:id` — Update
- `DELETE /api/v1/organizations/:org_id/patients/:patient_id/diagnoses/:id` — Delete

### Superbills
- `GET /api/v1/patients/:patient_id/superbills` — List patient superbills
- `POST /api/v1/superbills` — Create superbill
- `DELETE /api/v1/superbills/:id` — Delete superbill
- `GET /api/v1/superbills/services` — Get superbill services

---

## Appointments

### Practitioner Appointments
- `GET /api/v1/appointments/practitioner_index` — List appointments
  - Params: `start_date`, `end_date`, `patient_id`, `organization_id`, `status`
- `GET /api/v1/appointments/:id/practitioner_show` — Get appointment
- `POST /api/v1/appointments/practitioner_create` — Create appointment
  - Body: `{ appointment: { patient_id, start_time, end_time, location_type, ... } }`
- `PUT /api/v1/appointments/:id/practitioner_update` — Update appointment
- `DELETE /api/v1/appointments/:id/practitioner_delete` — Delete appointment
- `GET /api/v1/appointments/recent_addresses` — Recent appointment addresses
- `GET /api/v1/appointments/:id/history` — Appointment change history
- `GET /api/v1/appointments/:id/ics` — Download ICS calendar file
- `GET /api/v1/organizations/:org_id/appointments/status_report` — Appointment status report

### Caregiver Appointments
- `GET /api/v1/appointments/caregiver_index` — List appointments
- `GET /api/v1/appointments/caregiver_next` — Get next upcoming appointment
- `GET /api/v1/appointments/:id/caregiver_show` — Get appointment
- `PATCH /api/v1/appointments/:id/caregiver_cancel` — Cancel appointment

### Appointment Encounter
- `GET /api/v1/appointments/:appointment_id/encounter` — Get encounter for appointment

### Availabilities
- `GET /api/v1/availabilities` — List practitioner availabilities
- `POST /api/v1/availabilities` — Create availability slot
- `PUT /api/v1/availabilities/:id` — Update availability
- `DELETE /api/v1/availabilities/:id` — Delete availability

### Calendar Blocks
- `POST /api/v1/calendar_blocks` — Create calendar block (time off)
- `DELETE /api/v1/calendar_blocks/:id` — Delete calendar block

### Appointment Types
- `GET /api/v1/appointment_types` — List appointment types
- `POST /api/v1/appointment_types` — Create type
- `PUT /api/v1/appointment_types/:id` — Update type
- `DELETE /api/v1/appointment_types/:id` — Delete type
- `GET /api/v1/appointment_types/list_for_dropdown` — Types for dropdown

---

## Patient Encounters (EHR)

### Encounter Management
- `GET /api/v1/patient_encounters/billing_dashboard` — Billing dashboard
- `GET /api/v1/patient_encounters/:id/billing_detail` — Billing detail
- `GET /api/v1/patient_encounters/:id/billing` — Billing info
- `POST /api/v1/patient_encounters/:id/complete` — Complete encounter
- `POST /api/v1/patient_encounters/:id/reopen` — Reopen encounter
- `PATCH /api/v1/patient_encounters/:id/payment_type` — Update payment type
- `PATCH /api/v1/patient_encounters/:id/internal_notes` — Update internal notes
- `GET /api/v1/patient_encounters/:id/previous_encounter_care_services` — Previous services
- `POST /api/v1/patient_encounters/:id/prefill_documentation_from_previous` — Prefill from previous
- `POST /api/v1/patient_encounters/:id/attach_files` — Attach files
- `DELETE /api/v1/patient_encounters/:id/detach_file/:attachment_id` — Detach file

### Encounter Invoices
- `POST /api/v1/patient_encounters/:id/invoices/per_session` — Build per-session invoice
- `POST /api/v1/patient_encounters/:id/invoices/per_session_insurance_copay` — Build copay invoice
- `POST /api/v1/patient_encounters/:id/invoices/service_fee` — Add service fee

### Invoice Management
- `DELETE /api/v1/encounter_invoices/:id` — Delete invoice
- `POST /api/v1/encounter_invoices/:id/caregiver_charge` — Charge caregiver
- `POST /api/v1/encounter_invoices/:id/retry_charge` — Retry charge
- `POST /api/v1/encounter_invoices/:id/manual_charge` — Manual charge
- `POST /api/v1/encounter_invoices/:id/void` — Void invoice
- `POST /api/v1/encounter_invoices/:id/generate_pdf` — Generate PDF

### Invoice Payments
- `POST /api/v1/encounter_invoice_payments/:id/refund` — Refund payment

### Insurance Claims
- `POST /api/v1/patient_encounters/:encounter_id/insurance_claims/:id/retry` — Retry claim submission
- `POST /api/v1/patient_encounters/:encounter_id/insurance_claims/:id/poll` — Poll claim status

### Care Services
- `POST /api/v1/care_services` — Create care service (CPT code for encounter)
- `PUT /api/v1/care_services/:id` — Update care service
- `DELETE /api/v1/care_services/:id` — Delete care service

---

## Organizations

### Organization CRUD
- `GET /api/v1/organizations` — List user's organizations
- `GET /api/v1/organizations/:id` — Get organization details
- `POST /api/v1/organizations` — Create organization
- `PUT /api/v1/organizations/:id` — Update organization
- `PUT /api/v1/organizations/:id/update_insurances` — Update accepted insurances

### Organization Members
- `POST /api/v1/organizations/:id/invite_members` — Invite members
- `GET /api/v1/organizations/:id/members` — List members
- `GET /api/v1/organizations/:id/members/:member_id` — Get member details
- `GET /api/v1/organizations/:id/members_for_dropdown` — Members for dropdown
- `GET /api/v1/organizations/:id/pending_invitations` — Pending invitations
- `PUT /api/v1/organizations/:id/members/:member_id` — Update member role
- `POST /api/v1/organizations/:id/members/:member_id/resend_invitation` — Resend invitation
- `DELETE /api/v1/organizations/:id/members/:member_id` — Remove member

### Organization Patients
- `GET /api/v1/organizations/:id/my_patients` — Practitioner's patients in org
- `GET /api/v1/organizations/:id/my_patients_for_ehr_org_dropdown` — Patients for EHR dropdown
- `POST /api/v1/organizations/:id/assign_patient` — Assign patient to practitioner
- `DELETE /api/v1/organizations/:id/unassign_patient` — Unassign patient
- `GET /api/v1/organizations/:id/patients/analytics_report` — Patient analytics

### Organization Billing
- `POST /api/v1/organizations/:id/billing_portal` — Billing portal session
- `POST /api/v1/organizations/:id/billing_portal_subscription_update` — Subscription update session
- `POST /api/v1/organizations/:id/checkout_session` — Checkout session
- `GET /api/v1/organizations/:id/subscriptions` — Get subscriptions
- `POST /api/v1/organizations/:id/billing/onboarding/account_link` — Stripe Connect link
- `GET /api/v1/organizations/:id/billing/onboarding/refresh` — Refresh billing onboarding
- `GET /api/v1/organizations/:id/billing/status` — Billing status
- `PATCH /api/v1/organizations/:id/billing/cancel_fee` — Update cancel fee
- `GET /api/v1/organizations/:id/billing/invoice_settings` — Invoice settings
- `PATCH /api/v1/organizations/:id/billing/invoice_settings` — Update invoice settings

### Organization Care Services (CPT Codes)
- `GET /api/v1/organizations/:org_id/cpt_codes` — List care services
- `POST /api/v1/organizations/:org_id/cpt_codes` — Create care service
- `PUT /api/v1/organizations/:org_id/cpt_codes/:id` — Update care service
- `DELETE /api/v1/organizations/:org_id/cpt_codes/:id` — Delete care service
- `GET /api/v1/organizations/:org_id/cpt_codes/search` — Search care services
- `POST /api/v1/organizations/:org_id/cpt_codes/bulk_create` — Bulk create

### Organization Intake
- `GET /api/v1/organizations/:org_id/intake_flows` — List intake flows
- `POST /api/v1/organizations/:org_id/intake_flows` — Create intake flow
- `GET /api/v1/organizations/:org_id/intake_flows/:id` — Get intake flow
- `PUT /api/v1/organizations/:org_id/intake_flows/:id` — Update intake flow
- `DELETE /api/v1/organizations/:org_id/intake_flows/:id` — Delete intake flow
- `GET /api/v1/organizations/:org_id/intake_documents` — List intake documents
- `POST /api/v1/organizations/:org_id/intake_documents` — Create intake document
- `GET /api/v1/organizations/:org_id/intake_documents/:id` — Get intake document
- `PUT /api/v1/organizations/:org_id/intake_documents/:id` — Update intake document
- `DELETE /api/v1/organizations/:org_id/intake_documents/:id` — Delete intake document

### Organization Content Sharing
- `PATCH /api/v1/organizations/:id/content_sharing_rules` — Update content sharing rules

### Data Imports
- `POST /api/v1/organizations/:org_id/data_imports` — Create import
- `GET /api/v1/organizations/:org_id/data_imports` — List imports
- `GET /api/v1/organizations/:org_id/data_imports/:id` — Get import
- `POST /api/v1/organizations/:org_id/data_imports/:id/prepare_upload` — Prepare upload
- `POST /api/v1/organizations/:org_id/data_imports/:id/confirm_upload` — Confirm upload
- `POST /api/v1/organizations/:org_id/data_imports/:id/retry_analysis` — Retry analysis
- `POST /api/v1/organizations/:org_id/data_imports/:id/start_import` — Start import
- `POST /api/v1/organizations/:org_id/data_imports/:id/notify_on_completion` — Notify on completion

### Organization Participants
- `GET /api/v1/organization_participants/:id` — Get participant
- `PUT /api/v1/organization_participants/:id` — Update participant

---

## Workspaces

### Workspace Management
- `GET /api/v1/workspaces` — List workspaces
- `GET /api/v1/workspaces/:id` — Get workspace
- `GET /api/v1/workspaces/by_patient/:patient_id` — Get workspace by patient
- `PATCH /api/v1/workspaces/:id/auto_pay_billing` — Update auto-pay billing
- `PATCH /api/v1/workspaces/:id/settings` — Update workspace settings
- `GET /api/v1/workspaces/:id/patient_summary` — Patient summary
- `GET /api/v1/workspaces/:id/patient_summary_v2` — Patient summary v2
- `GET /api/v1/workspaces/:id/exercises` — Workspace exercises

### Workspace Intake
- `GET /api/v1/workspaces/:id/intake/status` — Intake status
- `PATCH /api/v1/workspaces/:id/intake/toggle_should_show_intake` — Toggle intake visibility
- `GET /api/v1/workspaces/:id/intake/workspace_managers` — Workspace managers
- `POST /api/v1/workspaces/:id/intake/send_reminders` — Send intake reminders

### Workspace Memberships
- `GET /api/v1/workspaces/:workspace_id/memberships` — List memberships
- `PUT /api/v1/workspaces/:workspace_id/memberships/:id` — Update relationship
- `DELETE /api/v1/workspaces/:workspace_id/memberships/:id` — Remove membership
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/resend_invitation` — Resend
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/grant_consent` — Grant consent
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/revoke_consent` — Revoke consent
- `GET /api/v1/workspaces/:workspace_id/memberships/:id/consent_agreement` — Get agreement
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/set_elected_organization` — Set org
- `GET /api/v1/memberships/pending` — Pending memberships
- `GET /api/v1/memberships/pending_consent` — Pending consent
- `GET /api/v1/memberships/pending_invitation_agreement` — Pending invitation agreements
- `POST /api/v1/memberships/:id/accept_invitation_agreement` — Accept invitation agreement

### Workspace Roles
- `GET /api/v1/workspaces/:workspace_id/roles` — List roles
- `POST /api/v1/workspaces/:workspace_id/roles` — Create role
- `PUT /api/v1/workspaces/:workspace_id/roles/:id` — Update role
- `DELETE /api/v1/workspaces/:workspace_id/roles/:id` — Delete role
- `POST /api/v1/workspaces/:workspace_id/roles/:id/assign_role` — Assign role
- `POST /api/v1/workspaces/:workspace_id/roles/:id/remove_role` — Remove role
- `POST /api/v1/workspaces/:workspace_id/roles/:id/add_permissions` — Add permissions
- `POST /api/v1/workspaces/:workspace_id/roles/:id/remove_permissions` — Remove permissions
- `GET /api/v1/workspaces/:workspace_id/roles/list_user_permissions` — List user permissions
- `GET /api/v1/workspace_roles/list_all_permissions` — List all available permissions

---

## Match Requests

- `GET /api/v1/match_requests/practitioner_index` — List (practitioner view)
- `GET /api/v1/match_requests/caregiver_index` — List (caregiver view)
- `GET /api/v1/match_requests/:id` — Get match request
- `POST /api/v1/match_requests/create_marketplace_booking` — Create marketplace booking
- `POST /api/v1/match_requests/preview_booking_summary` — Preview booking summary
- `PATCH /api/v1/match_requests/:id/accept` — Accept
- `PATCH /api/v1/match_requests/:id/reject` — Reject
- `PATCH /api/v1/match_requests/:id/decline` — Decline
- `PATCH /api/v1/match_requests/:id/cancel` — Cancel
- `PATCH /api/v1/match_requests/:id/propose_alternative` — Propose alternative time
- `PATCH /api/v1/match_requests/:id/reschedule_meet_greet` — Reschedule meet & greet
- `PATCH /api/v1/match_requests/:id/confirm` — Confirm
- `GET /api/v1/match_requests/:id/history` — History

---

## AI Matchmaking

- `POST /api/v1/ai_matchmaking` — Create matchmaking query
- `GET /api/v1/ai_matchmaking/search_history` — Search history
- `POST /api/v1/ai_matchmaking/track_interaction` — Track interaction
- `GET /api/v1/ai_matchmaking/:slug` — Get matchmaking result

---

## Marketplace

### Practitioners
- `GET /api/v1/marketplace/practitioners` — Search marketplace practitioners
  - Params: `latitude`, `longitude`, `radius`, `specializations[]`, `insurance_plan_ids[]`, `care_setting`, `page`
- `GET /api/v1/marketplace/practitioners/availability_counts` — Availability counts
- `GET /api/v1/marketplace/providers/:id` — Get provider profile
- `GET /api/v1/marketplace/providers/:id/available_slots` — Available slots
  - Params: `start_date`, `end_date`, `appointment_type_id`
- `GET /api/v1/marketplace/providers/:id/usually_available` — Usual availability

### Service Areas
- `GET /api/v1/marketplace/service_areas` — List service areas

### Bookings
- `GET /api/v1/marketplace/bookings/status` — Booking status
- `POST /api/v1/marketplace/bookings/prepare` — Prepare booking

---

## Chat

### Channels
- `GET /api/v1/chat_channels` — List channels
- `GET /api/v1/chat_channels/:id` — Get channel
- `POST /api/v1/chat_channels` — Create channel
- `PATCH /api/v1/chat_channels/:id` — Update channel
- `DELETE /api/v1/chat_channels/:id` — Archive channel
- `POST /api/v1/chat_channels/:id/add_members` — Add members
- `POST /api/v1/chat_channels/:id/remove_members` — Remove members
- `GET /api/v1/chat_channels/:id/members` — Get members
- `GET /api/v1/chat_channels/direct_dm_counterparts` — DM counterparts

### Attachments
- `POST /api/v1/chat_attachments` — Create attachment
- `GET /api/v1/chat_attachments/:id` — Get attachment
- `PUT /api/v1/chat_attachments/signed_url` — Get signed upload URL

### Messages
- `GET /api/v1/chat_messages/latest_in_workspace` — Latest in workspace
- `GET /api/v1/chat_messages/latest_across_workspaces` — Latest across workspaces
- `GET /api/v1/chat_messages/last_sent_by_user_in_workspace` — Last sent by user
- `GET /api/v1/chat_messages/last_sent_by_user_across_workspaces` — Last sent across workspaces
- `GET /api/v1/chat_messages/unread_counts_by_channel` — Unread counts

### Exports
- `POST /api/v1/chat_exports` — Create chat export

---

## Clinical Notes & Forms

### Clinical Note Forms
- `POST /api/v1/clinical_note_forms` — Create clinical note form
- `PUT /api/v1/clinical_note_forms/:id` — Update form
- `DELETE /api/v1/clinical_note_forms/:id` — Delete form
- `GET /api/v1/clinical_note_forms/list_for_patient` — List for patient
- `GET /api/v1/clinical_note_forms/org_members_for_dropdown` — Org members dropdown
- `POST /api/v1/clinical_note_forms/:id/generate_pdf` — Generate PDF

### Clinical Form Templates
- `GET /api/v1/clinical_form_templates` — List templates
- `GET /api/v1/clinical_form_templates/:id` — Get template
- `GET /api/v1/clinical_form_templates/intake/:intake_type` — Get intake template

### AI Scribe
- `POST /api/v1/ai_scribe/clinical_note_drafts` — Create AI-generated clinical note draft
- `POST /api/v1/ai_scribe/summarize_encounter` — Summarize encounter
- `POST /api/v1/ai_scribe/summarize_encounter_for_caregiver_audience` — Summarize for caregiver

---

## Exercises

- `POST /api/v1/exercises` — Create exercise
- `GET /api/v1/exercises/:id` — Get exercise
- `PUT /api/v1/exercises/:id` — Update exercise
- `DELETE /api/v1/exercises/:id` — Delete exercise
- `GET /api/v1/exercises/:id/current_progress` — Current progress
- `GET /api/v1/exercise_progresses/:id` — Get progress
- `PUT /api/v1/exercise_progresses/:id` — Update progress

### Exercise Files
- `GET /api/v1/exercises/:exercise_id/exercise_files` — List files
- `POST /api/v1/exercises/:exercise_id/exercise_files` — Upload file
- `GET /api/v1/exercises/:exercise_id/exercise_files/:id` — Get file
- `DELETE /api/v1/exercises/:exercise_id/exercise_files/:id` — Delete file
- `PUT /api/v1/exercises/:exercise_id/exercise_files/signed_url` — Get signed upload URL

---

## Referrals

- `GET /api/v1/referrals` — List referrals
- `GET /api/v1/referrals/:id` — Get referral
- `POST /api/v1/referrals` — Create referral
- `PUT /api/v1/referrals/:id` — Update referral
- `DELETE /api/v1/referrals/:id` — Delete referral
- `GET /api/v1/referrals/:id/accept_referral` — Get acceptance info
- `POST /api/v1/referrals/:id/accept_referral` — Accept referral
- `POST /api/v1/referrals/:id/cancel` — Cancel referral

---

## Practitioners

- `POST /api/v1/practitioners` — Create practitioner profile
- `PUT /api/v1/practitioners/:id` — Update practitioner
- `GET /api/v1/practitioners/:id/basic_info` — Basic practitioner info
- `GET /api/v1/practitioners/:id` — Get practitioner

---

## Invitations

- `POST /api/v1/invitations/practitioner` — Invite practitioner to workspace
- `POST /api/v1/invitations/caregiver` — Invite caregiver to workspace
- `POST /api/v1/invitations/school` — Invite school to workspace
- `PUT /api/v1/invitations/accept_invitation` — Accept invitation

### Guardian Invitations
- `GET /api/v1/guardian_invitations` — List
- `GET /api/v1/guardian_invitations/:id` — Get
- `POST /api/v1/guardian_invitations/:id/accept` — Accept
- `POST /api/v1/guardian_invitations/:id/reject` — Reject
- `POST /api/v1/guardian_invitations/:id/resend` — Resend
- `GET /api/v1/guardian_invitations/:id/potential_duplicates` — Potential duplicates
- `POST /api/v1/guardian_invitations/:id/merge_with_patient` — Merge with patient
- `POST /api/v1/guardian_invitations/:id/create_new_workspace` — Create new workspace
- `GET /api/v1/guardian_invitations/:id/current_agreement` — Current agreement
- `POST /api/v1/patients/:patient_id/guardian_invitations` — Create

---

## User Agreements

- `GET /api/v1/user_agreements` — List agreements
- `GET /api/v1/user_agreements/:id` — Get agreement
- `POST /api/v1/user_agreements/:id/accept` — Accept agreement
- `GET /api/v1/user_agreements/latest` — Latest agreement
- `GET /api/v1/user_agreements/check_acceptances` — Check acceptances

---

## Preferences

### Notification Preferences
- `GET /api/v1/notification_preferences` — Get preferences
- `PUT /api/v1/notification_preferences` — Update preferences
- `POST /api/v1/notification_preferences/pause` — Pause notifications
- `POST /api/v1/notification_preferences/unpause` — Unpause notifications
- `GET /api/v1/notification_preferences/options` — Get options

### Calendar Preferences
- `GET /api/v1/calendar_preferences` — Get preferences
- `PUT /api/v1/calendar_preferences` — Update preferences

---

## Reference Data

- `GET /api/v1/license_types` — License types (OT, PT, SLP, etc.)
- `GET /api/v1/focus_areas` — Focus areas (Autism, ADHD, etc.)
- `GET /api/v1/specializations` — Specializations
- `GET /api/v1/languages` — Languages
- `GET /api/v1/age_ranges` — Age ranges
- `GET /api/v1/icd_codes` — ICD diagnosis codes
- `GET /api/v1/insurance_plans` — Insurance plans
- `GET /api/v1/subscription_plans` — Subscription plans
- `GET /api/v1/npi` — NPI lookup (params: `number` or `name`)

---

## Consents

- `GET /api/v1/consents/term_length` — Get consent term length

---

## Push Notifications

- `POST /api/v1/push_notification_tokens` — Register device token
- `DELETE /api/v1/push_notification_tokens` — Unregister device token

---

## Silna (Insurance Integration)

- `GET /api/v1/silna/providers` — List Silna providers
- `GET /api/v1/silna/service_locations` — List service locations
- `GET /api/v1/silna/patient_plans/:patientPlanId/benefits_checks` — Benefits checks
- `POST /api/v1/silna/benefits_checks/:id/report` — Generate benefits check report

---

## Self-Service & Signups

- `GET /api/v1/self_service_signup_submission` — Get self-service signup submission
- `POST /api/v1/vmg_signups` — Create VMG signup
