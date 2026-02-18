# Village API Endpoint Reference

Complete reference for all Village REST API endpoints (`/api/v1/`).
All endpoints require authentication via OAuth Bearer token (handled automatically by `village_api`).

---
# Village API v1 Endpoint Reference

_Auto-generated on 2026-02-17 18:43:56 from live Rails routes._
_Descriptions sourced from `config/api_endpoint_descriptions.yml`._

All endpoints are under `/api/v1/` and require authentication via OAuth Bearer token unless noted otherwise.

> **Note:** Auth routes (`/api/v1/auth/*`) are excluded from this document.
> Scaffold-only actions (`new`, `edit`) are also excluded.

---

## Users

- `GET /api/v1/users` — List users visible to the caller.
  - Params: `none`
  - Response: Array of { ...UserSerializer fields... }
  - Note: Uses policy_scope(User) from UserPolicy (admins see all, others see self).
- `POST /api/v1/users` — Create a new user record.
  - Params: `user[first_name], user[last_name], user[email], user[phone_number], user[street_address], user[apartment_suite], user[city], user[state], user[zip], user[avatar], user[sms_consent]`
  - Response: { ...UserSerializer fields... }
  - Note: Uses UserService.create_user and returns HTTP 422 with validation errors when creation fails.
- `PUT /api/v1/users` — Update the current user's own profile details.
  - Params: `user[first_name], user[last_name], user[phone_number], user[street_address], user[apartment_suite], user[city], user[state], user[zip], user[avatar], user[sms_consent]`
  - Response: { ...UserSerializer fields... }
  - Note: Requires UserPolicy.update? and update permission on User for self-updates. Tracks Mixpanel User Updated event on success.
- `GET /api/v1/users/:id` — Fetch one user profile by ID.
  - Params: `none`
  - Response: { ...UserSerializer fields... }
  - Note: Requires UserPolicy.show? (self or admin).
- `DELETE /api/v1/users/:id` — Delete a user by ID.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Destroys user found by UserService.find_user. No explicit authorize call is performed in this action.
- `PUT /api/v1/users/:id/update_by_id` — Update another user by ID using admin-capable user attributes.
  - Params: `user[first_name], user[last_name], user[email], user[phone_number], user[street_address], user[apartment_suite], user[city], user[state], user[zip], user[is_admin], user[avatar], user[sms_consent]`
  - Response: { ...UserSerializer fields... }
  - Note: Uses UserService.update_user with no explicit policy authorize call in this action.
- `PATCH /api/v1/users/complete_onboarding` — Mark the current user as onboarded after onboarding flow completion.
  - Params: `none`
  - Response: { success, message }
  - Note: Requires UserPolicy.complete_onboarding? (self or admin). Sets onboarded true and tracks Mixpanel Onboarding Completed event.
- `GET /api/v1/users/current` — Return the currently authenticated user profile.
  - Params: `none`
  - Response: { ...UserSerializer fields... }
  - Note: Uses token-auth current_user context.
- `GET /api/v1/users/my_portal_permissions` — Return the current user's portal, workspace, and organization permission payload used to configure client capabilities.
  - Params: `none`
  - Response: { permissions, can_create_dm, can_create_channel, organization_permissions, feature_flags, mobile_app_versions }
  - Note: Optionally records device app version from request headers X-App-Version, X-Device-ID, X-OS-Type, and X-OS-Version before building permission payloads.
- `POST /api/v1/users/update_profile_picture` — Upload or replace the current user's avatar image.
  - Params: `avatar*`
  - Response: { ...UserSerializer fields... }
  - Note: Requires UserPolicy.update_profile_picture? and tracks Mixpanel User Avatar Updated event on success.

---

## Passwords

- `PATCH /api/v1/password/change` — Placeholder custom route for password change; no `change` action is implemented in Api::V1::PasswordsController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: routes.rb defines patch password/change to passwords#change, but controller currently implements create/update/first_password only.
- `POST /api/v1/password/first` — Set initial password for self-service signup user using one-time token.
  - Params: `self_service_signup_id*, one_time_token*, password*, password_confirmation*`
  - Response: { success, message, user: { ... } }
  - Note: Public endpoint. Token must map to user via reset-password token and match self_service_signup_id; rejects if password already set or token expired. On success, sends confirmation instructions when needed, issues auth headers, triggers Slack/HubSpot notifications.

---

## Patients

- `GET /api/v1/patients` — List patients visible to the current user, with optional filtering, search, and pagination for dashboard and directory views.
  - Params: `stage[] (prospect|waitlist|current_patient|former_patient|never_started), status[] (active|inactive|archived), gender[] (male|female|prefer_not_to_say), search, organization[], age[] (0-3|4-6|7-9|10-12|13-17|18+|custom), age_start (YYYY-MM-DD), age_end (YYYY-MM-DD), sort (recent), page, per_page, limit`
  - Response: When paginated: { patients: Array<{ ...PatientSerializer fields... }>, pagy: { page, items, pages, count, prev, next }, errors: [] }. Without pagination params: Array<{ ...PatientSerializer fields... }>.
  - Note: Uses policy_scope(Patient) plus Patients::PatientsQuery filters, always excluding prospect patients with unaccepted match-request states. Invalid filter values return HTTP 400 with an error message.
- `POST /api/v1/patients` — Create a caregiver-managed patient, including the care-navigator-assisted parent-invitation path, and return the full patient profile.
  - Params: `patient[first_name]*, patient[last_name]*, patient[preferred_name], patient[gender], patient[date_of_birth], patient[phone_number], patient[street_address], patient[apartment_suite], patient[city], patient[state], patient[zip], patient[relationship], patient[stage], patient[intake_flow_type], patient[intake_flow_id], patient[focus_area_ids][], parent[first_name], parent[last_name], parent[email], parent[phone_number]`
  - Response: { ...PatientSerializer fields... }
  - Note: Requires PatientPolicy.create? and onboarding guard checks. Endpoint is caregiver-only (practitioners must use create_practitioner_patient). Successful creates track Mixpanel and enqueue UpdatePatientLastActionJob; caregiver flows also create workspace memberships and enqueue CreateWorkspaceTeamChannelJob after commit.
- `GET /api/v1/patients/:id` — Fetch one patient with full profile details for patient charts and profile pages.
  - Params: `none`
  - Response: { ...PatientSerializer fields... }
  - Note: Requires PatientPolicy.show?. Controller eager-loads caregivers and assigned-practitioner user avatars before serialization.
- `PUT|PATCH /api/v1/patients/:id` — Update editable patient demographics and profile fields.
  - Params: `patient[first_name], patient[last_name], patient[preferred_name], patient[gender], patient[date_of_birth], patient[phone_number], patient[street_address], patient[apartment_suite], patient[city], patient[state], patient[zip], patient[relationship], patient[stage], patient[intake_flow_type], patient[intake_flow_id], patient[focus_area_ids][]`
  - Response: { ...PatientSerializer fields... }
  - Note: Requires PatientPolicy.update?. On successful save, enqueues workspace propagation for changed shared demographic fields and tracks a Mixpanel Patient Updated event.
- `DELETE /api/v1/patients/:id` — Delete a patient record that the caller is allowed to manage.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Requires PatientPolicy.destroy? (admin, workspace delete permission, or ownership). Tracks a Mixpanel Patient Deleted event on success.
- `GET /api/v1/patients/:id/access` — Run a lightweight access check so clients can safely gate patient-specific routes before loading full data.
  - Params: `none`
  - Response: { patient_id, can_view }
  - Note: Uses PatientPolicy.show?. Unauthorized and missing-patient checks both return HTTP 200 with can_view false to avoid revealing resource state; unexpected exceptions return 500 with can_view false and an error message.
- `POST /api/v1/patients/:id/admission_details` — Save admission and intake metadata on a patient in one request, including stage, default payment type, requested services, and referral details.
  - Params: `admission_details[stage], admission_details[payment_type], admission_details[zip_code], admission_details[referral_source], admission_details[intake_flow_type], admission_details[intake_flow_id], admission_details[requested_services][], admission_details[referring_physician][first_name], admission_details[referring_physician][last_name], admission_details[referring_physician][email], admission_details[referring_physician][phone], admission_details[referring_physician][phone_extension], admission_details[referring_physician][practice_name]`
  - Response: { success, patient, errors } where patient is PatientSerializer
  - Note: Requires PatientPolicy.update?. Validates stage and payment_type enums before transaction, filters requested_services to allowed values at model save time, optionally creates a referring physician record when referral_source is physician, and tracks a Mixpanel event on success.
- `GET /api/v1/patients/:id/appointment_readiness` — Return readiness data used by appointment-readiness dashboards for a single patient.
  - Params: `none`
  - Response: { is_ready, billing_preference, meet_and_greet_date, next_appointment_id, next_appointment_date, financial_readiness: { patient_name_dob_and_address, payment_method, insurance_policy, benefit_check_status, in_network_status }, guardian: { name, phone }, guardian_invitation: { sent_at, status, expires_at, accepted_at, invited_by_name, invitee_name, invitee_email, invitee_phone, invitee_relationship } }
  - Note: Requires PatientPolicy.show?. Built by PatientAppointmentReadinessService; cash-pay readiness only requires patient demographic completeness plus payment method, while insurance readiness requires completed benefits-check and eligibility indicators.
- `PATCH /api/v1/patients/:id/auto_pay_billing` — Update whether billing for an organization-owned patient should auto-charge saved payment methods.
  - Params: `auto_pay_billing* (boolean)`
  - Response: { auto_pay_billing, errors: [] }
  - Note: Requires PatientPolicy.update_payment_methods_provider?. Only valid for organization-owned patients and cannot be disabled when the organization requires auto-pay billing.
- `GET /api/v1/patients/:id/basic_info` — Fetch a compact patient profile payload for lightweight UI contexts like headers and dropdowns.
  - Params: `none`
  - Response: { id, display_name, avatar_url, first_name, last_name, workspace_id, created_by_organization_id, created_by_user_id, status, stage }
  - Note: Requires PatientPolicy.show?.
- `PATCH /api/v1/patients/:id/billing_preference` — Set the default encounter payment type used for future encounter billing on an organization-owned patient.
  - Params: `default_encounter_payment_type (cash|insurance)`
  - Response: { default_encounter_payment_type, errors: [] }
  - Note: Requires PatientPolicy.update_payment_methods_provider?. Only organization-owned patients are supported; insurance is rejected unless insurance claims are enabled for that organization and the caller has active org-member access.
- `GET /api/v1/patients/:id/check_duplicates` — Check whether a patient would duplicate an existing organization-owned patient based on normalized name and date of birth.
  - Params: `organization_id* (query)`
  - Response: { has_duplicates, existing_patients: Array<{ id, first_name, last_name, preferred_name, display_name, date_of_birth, avatar_url }> }
  - Note: Requires PatientPolicy.show? on the source patient and create_patient permission on the target organization.
- `GET /api/v1/patients/:id/team_members` — Return a unified team list for a patient by merging workspace members, patient caregivers, and assigned providers.
  - Params: `none`
  - Response: Array of { user_id, name, email, avatar_url, phone_number, practitioner_id, role, relationship, workspace_membership_id, patient_caregiver_id, practice_role, consent_status, consent_expires_at, invitation_pending, guardian_invitation_status, is_workspace_member, is_patient_contact, is_assigned_provider, access_type }
  - Note: Requires PatientPolicy.show?. access_type is one of workspace, contact_only, both, or assigned_provider. guardian_invitation_status is included when a caregiver has an invitation record for the patient.
- `POST /api/v1/patients/:id/update_avatar` — Upload or replace a patient's avatar image.
  - Params: `avatar*`
  - Response: { ...PatientSerializer fields... }
  - Note: Requires PatientPolicy.update? and updates avatar through model attachment handling. Tracks a Mixpanel Patient Avatar Updated event on success.
- `POST /api/v1/patients/appointment_readiness_batch` — Return appointment-readiness payloads for multiple patients in a single request.
  - Params: `patient_ids* (Array<Integer>)`
  - Response: { "<patient_id>": { ...appointment_readiness fields... }, ... }
  - Note: Uses policy_scope(Patient) instead of per-record authorize calls and silently filters out unauthorized patient IDs.
- `POST /api/v1/patients/practitioner` — Create an organization-owned patient under a practitioner-selected organization, including duplicate detection and immediate practitioner assignment.
  - Params: `organization_id*, patient[first_name]*, patient[last_name]*, patient[preferred_name], patient[gender], patient[date_of_birth], patient[phone_number], patient[street_address], patient[apartment_suite], patient[city], patient[state], patient[zip], patient[relationship], patient[stage], patient[intake_flow_type], patient[intake_flow_id], patient[focus_area_ids][]`
  - Response: { ...PatientSerializer fields... }
  - Note: Requires PatientPolicy.create?, practitioner profile, practitioner membership in organization_id, and onboarding guard checks. Duplicate matches in the organization return HTTP 422 with DUPLICATE_PATIENT error_code. Successful creates attempt practitioner assignment and workspace invitation via OrganizationPatientsService, enqueue UpdatePatientLastActionJob, and create provider-led pipeline cards for VMG full org flows.

---

## Patient Caregivers

- `GET /api/v1/caregivers` — Placeholder caregiver-list route generated by resources; no index action is currently implemented in Api::V1::CaregiversController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: Route exists in `resources :caregivers`, but controller only defines create/show. Calls to this endpoint currently fail before business logic executes.
- `POST /api/v1/caregivers` — Convert/update the current authenticated user into a caregiver profile and return the caregiver record.
  - Params: `caregiver[first_name], caregiver[last_name], caregiver[phone_number], caregiver[email], caregiver[street_address], caregiver[apartment_suite], caregiver[city], caregiver[state], caregiver[zip]`
  - Response: { id, first_name, last_name, name, initials, phone_number, formatted_phone_number, email, street_address, apartment_suite, city, state, zip, care_navigator, user: { ... } }
  - Note: Uses CreateCaregiverOrganizer interactor, which updates current_user with fields, creates Caregiver record if absent, and assigns caregiver portal role. Tracks Mixpanel event \"Caregiver Created\" on success. Returns 422 with validation message when user update/caregiver creation fails (e.g., user already a practitioner or invalid user attributes).
- `GET /api/v1/caregivers/:id` — Fetch one caregiver profile by caregiver id.
  - Params: `none`
  - Response: { id, first_name, last_name, name, initials, phone_number, formatted_phone_number, email, street_address, apartment_suite, city, state, zip, care_navigator, user: { ... } }
  - Note: Uses CaregiverService.find(params[:id]) and serializes with CaregiverSerializer. This action currently does not run a Pundit authorization check, so any authenticated user can request a caregiver record by id.
- `PUT|PATCH /api/v1/caregivers/:id` — Placeholder caregiver-update route generated by resources; no update action is currently implemented in Api::V1::CaregiversController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: Route exists in `resources :caregivers`, but controller only defines create/show. Calls to this endpoint currently fail before business logic executes.
- `DELETE /api/v1/caregivers/:id` — Placeholder caregiver-destroy route generated by resources; no destroy action is currently implemented in Api::V1::CaregiversController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: Route exists in `resources :caregivers`, but controller only defines create/show. Calls to this endpoint currently fail before business logic executes.
- `GET /api/v1/caregivers/relationship_types` — Return allowed caregiver relationship enum values.
  - Params: `none`
  - Response: { relationship_types }
  - Note: Public helper endpoint; returns PatientCaregiver::RELATIONSHIP_TYPES.
- `GET /api/v1/patients/:patient_id/caregivers` — List caregiver associations for a patient, including guardian-invitation status metadata.
  - Params: `none`
  - Response: Array of { id, relationship, created_at, updated_at, caregiver_id, patient_id, full_name_with_relationship, caregiver_user, guardian_invitation_status }
  - Note: Requires PatientPolicy.show?. Preloads guardian invitations by caregiver to avoid N+1 lookups.
- `POST /api/v1/patients/:patient_id/caregivers` — Add a caregiver association to a patient.
  - Params: `caregiver[first_name]*, caregiver[last_name]*, caregiver[email]*, caregiver[phone_number], caregiver[relationship]*`
  - Response: { caregiver: { id, relationship, created_at, updated_at, caregiver_id, patient_id, full_name_with_relationship, caregiver_user, guardian_invitation_status }, message }
  - Note: Requires PatientPolicy.update? on patient. Uses PatientCaregiverService.add_caregiver (find/create user+caregiver as needed) and returns validation errors as 422.
- `GET /api/v1/patients/:patient_id/caregivers/:id` — Fetch one caregiver association for a patient.
  - Params: `none`
  - Response: { id, relationship, created_at, updated_at, caregiver_id, patient_id, full_name_with_relationship, caregiver_user, guardian_invitation_status }
  - Note: Requires PatientPolicy.show?.
- `PUT|PATCH /api/v1/patients/:patient_id/caregivers/:id` — Update relationship label for a patient-caregiver association.
  - Params: `caregiver[relationship]*`
  - Response: { caregiver: { id, relationship, created_at, updated_at, caregiver_id, patient_id, full_name_with_relationship, caregiver_user, guardian_invitation_status }, message }
  - Note: Requires PatientPolicy.update? on patient. Uses PatientCaregiverService.update_caregiver.
- `DELETE /api/v1/patients/:patient_id/caregivers/:id` — Remove a caregiver association from a patient.
  - Params: `none`
  - Response: { message }
  - Note: Requires PatientPolicy.update? on patient. Uses PatientCaregiverService.remove_caregiver and tracks analytics.

---

## Patient Files & Folders

- `GET /api/v1/patients/:patient_id/files` — List patient files with optional folder and ownership filtering.
  - Params: `folder_id (include key to scope folder; blank means root), ownership[] (workspace|org_shared|org_private)`
  - Response: Array of { id, name, url, content_type, size, patient_id, folder_id, created_by_organization, created_by, created_at, shared_to_workspace, thumbnail_url, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on patient; records are filtered by PatientFilePolicy::Scope plus optional OwnershipFilterable categories.
- `POST /api/v1/patients/:patient_id/files` — Upload/create a patient file record (direct-upload blob or multipart file).
  - Params: `blob_id OR file[attachment], folder_id, shared_to_workspace (top-level or patient_file[shared_to_workspace])`
  - Response: { id, name, url, content_type, size, patient_id, folder_id, created_by_organization, created_by, created_at, shared_to_workspace, thumbnail_url, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on patient and PatientFilePolicy.create?. For org-owned patients, default shared_to_workspace comes from OrganizationContentSharingRule unless explicitly provided.
- `GET /api/v1/patients/:patient_id/files/:id` — Fetch one patient file record and download metadata.
  - Params: `none`
  - Response: { id, name, url, content_type, size, patient_id, folder_id, created_by_organization, created_by, created_at, shared_to_workspace, thumbnail_url, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on patient and PatientFilePolicy.show?.
- `PUT|PATCH /api/v1/patients/:patient_id/files/:id` — Update patient file metadata (name, sharing flag, folder placement).
  - Params: `name, shared_to_workspace, folder_id (top-level or patient_file nested)`
  - Response: { id, name, url, content_type, size, patient_id, folder_id, created_by_organization, created_by, created_at, shared_to_workspace, thumbnail_url, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on patient and PatientFilePolicy.update?. folder_id must belong to the same patient; blank/null moves file to root.
- `DELETE /api/v1/patients/:patient_id/files/:id` — Delete a patient file.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires PatientPolicy.show? on patient and PatientFilePolicy.destroy?. Tracks Mixpanel \"File Deleted\".
- `PUT /api/v1/patients/:patient_id/files/signed_url` — Generate direct-upload signed URL and blob record for patient file upload.
  - Params: `filename*, content_type*, checksum, size*`
  - Response: { signed_url, blob_id, key, headers: { Content-Type } }
  - Note: Requires PatientPolicy.show? on patient and PatientFilePolicy.create? on a dummy file.
- `GET /api/v1/patients/:patient_id/folders` — List folders for a patient file tree.
  - Params: `all (boolean), parent_id`
  - Response: Array of { id, patient_id, parent_folder_id, name, created_at, updated_at, items_count }
  - Note: Requires PatientPolicy.show? on patient plus PatientFolderPolicy::Scope visibility. all=true returns flat folder list; otherwise scoped to parent_id (root when blank).
- `POST /api/v1/patients/:patient_id/folders` — Create a folder in a patient's file hierarchy.
  - Params: `name* and parent_folder_id (top-level or patient_folder nested payload)`
  - Response: { id, patient_id, parent_folder_id, name, created_at, updated_at, items_count }
  - Note: Requires PatientPolicy.show? on patient and PatientFolderPolicy.create?. parent_folder_id must be in same patient tree.
- `GET /api/v1/patients/:patient_id/folders/:id` — Fetch one patient folder and item count.
  - Params: `none`
  - Response: { id, patient_id, parent_folder_id, name, created_at, updated_at, items_count }
  - Note: Requires PatientPolicy.show? on patient and PatientFolderPolicy.show?.
- `PUT|PATCH /api/v1/patients/:patient_id/folders/:id` — Rename folder and/or move it under a different parent.
  - Params: `name, parent_folder_id (top-level or patient_folder nested payload)`
  - Response: { id, patient_id, parent_folder_id, name, created_at, updated_at, items_count }
  - Note: Requires PatientPolicy.show? on patient and PatientFolderPolicy.update?. Model prevents moving folder under itself or descendants.
- `DELETE /api/v1/patients/:patient_id/folders/:id` — Delete a patient folder.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires PatientPolicy.show? on patient and PatientFolderPolicy.destroy?. Subfolders are deleted recursively and file records are nullified from folder.

---

## Patient Goals

- `GET /api/v1/patients/:patient_id/goals` — List goals for a patient, with optional assignment/category/status/ownership filtering.
  - Params: `filters[assignment] ("my_goals" for practitioner-owned goals), filters[category][] (Goal::CATEGORIES keys), filters[achievement_status][] (Goal.achievement_statuses keys), ownership[] (workspace|org_shared|org_private)`
  - Response: Array of { id, category, title, description, due_date, lifecycle_status, achievement_status, start_date, status_updated_at, shared_to_workspace, created_at, updated_at, subject: { ... }, practitioner: { ... }, exercises: [{ ... }] }
  - Note: Requires PatientPolicy.show? and GoalPolicy::Scope visibility. Uses GoalsFilter for assignment/category/achievement filters and OwnershipFilterable for ownership[].
- `POST /api/v1/patients/:patient_id/goals` — Create a patient goal with optional practitioner assignment.
  - Params: `goal[category], goal[title], goal[description], goal[due_date], goal[lifecycle_status], goal[start_date], goal[status_updated_at], goal[achievement_status], goal[practitioner_id], goal[shared_to_workspace]`
  - Response: { id, category, title, description, due_date, lifecycle_status, achievement_status, start_date, status_updated_at, shared_to_workspace, created_at, updated_at, subject: { ... }, practitioner: { ... }, exercises: [] }
  - Note: Requires PatientPolicy.show? on patient and GoalPolicy.create? (checked on dummy goal). GoalCreator validates patient/practitioner, defaults shared_to_workspace from organization content-sharing rules (or true for workspace-native patients), tracks Mixpanel, and enqueues UpdatePatientLastActionJob.
- `GET /api/v1/patients/:patient_id/goals/:id` — Fetch one goal and its linked exercises.
  - Params: `none`
  - Response: { id, category, title, description, due_date, lifecycle_status, achievement_status, start_date, status_updated_at, shared_to_workspace, created_at, updated_at, subject: { ... }, practitioner: { ... }, exercises: [{ ... }] }
  - Note: Requires PatientPolicy.show? on patient plus GoalPolicy.view?.
- `PUT|PATCH /api/v1/patients/:patient_id/goals/:id` — Update goal metadata, lifecycle state, practitioner assignment, and workspace sharing flag.
  - Params: `goal[category], goal[title], goal[description], goal[due_date], goal[lifecycle_status], goal[status_updated_at], goal[achievement_status], goal[practitioner_id], goal[shared_to_workspace]`
  - Response: { id, category, title, description, due_date, lifecycle_status, achievement_status, start_date, status_updated_at, shared_to_workspace, created_at, updated_at, subject: { ... }, practitioner: { ... }, exercises: [{ ... }] }
  - Note: Requires PatientPolicy.show? on patient plus GoalPolicy.update?. Validation failures return 422.
- `DELETE /api/v1/patients/:patient_id/goals/:id` — Delete a goal from the patient care plan.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires PatientPolicy.show? on patient plus GoalPolicy.destroy? permission.
- `POST /api/v1/patients/:patient_id/goals/:id/add_exercise` — Attach an existing exercise to a goal.
  - Params: `exercise_id*`
  - Response: { id, category, title, description, due_date, lifecycle_status, achievement_status, start_date, status_updated_at, shared_to_workspace, created_at, updated_at, subject: { ... }, practitioner: { ... }, exercises: [{ ... }] }
  - Note: Requires PatientPolicy.show? on patient, GoalPolicy.update? on goal, and ExercisePolicy.update? on exercise. GoalExercise validations enforce same patient/practitioner alignment between goal and exercise.

---

## Patient Insurance Policies

- `GET /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies` — List practitioner-visible insurance policies for a patient in organization context.
  - Params: `none`
  - Response: { policies: [{ ...insurance policy... }], errors: [] }
  - Note: Requires PatientPolicy.show?. Organization must have insurance claims enabled (membership check skipped for caregiver booking flow compatibility).
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies` — Create practitioner-managed insurance policy for an organization patient.
  - Params: `policy[member_number]*, policy[group_number], policy[priority_type], policy[insurance_plan_id]*, policy[insurance_type], policy[plan_order_number], policy[start_date], policy[end_date], policy[subscriber_first_name]*, policy[subscriber_last_name]*, policy[subscriber_date_of_birth]*, policy[subscriber_gender]*, policy[subscriber_relationship_to_patient]*, policy[insurance_card_front], policy[insurance_card_back]`
  - Response: { policy: { ...insurance policy... }, errors: [] }
  - Note: Requires PatientPolicy.update_related_data? and insurance_claims_enabled for organization. Enforces one primary policy per patient, attaches uploaded card images, may trigger Silna eligibility checks, and propagates policy to workspace.
- `PUT|PATCH /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/:id` — Update practitioner-managed insurance policy fields and optional card attachments.
  - Params: `policy[member_number], policy[group_number], policy[priority_type], policy[insurance_plan_id], policy[insurance_type], policy[plan_order_number], policy[start_date], policy[end_date], policy[subscriber_first_name], policy[subscriber_last_name], policy[subscriber_date_of_birth], policy[subscriber_gender], policy[subscriber_relationship_to_patient], policy[insurance_card_front], policy[insurance_card_back]`
  - Response: { policy: { ...insurance policy... }, errors: [] }
  - Note: Requires PatientPolicy.update_related_data? and insurance_claims_enabled. Runs Silna eligibility check when relevant fields changed and propagates changes across workspace.
- `DELETE /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/:id` — Delete practitioner-managed insurance policy.
  - Params: `none`
  - Response: { policy: { deleted: true }, errors: [] }
  - Note: Requires PatientPolicy.update_related_data? and insurance_claims_enabled. Deletion is blocked when policy has linked claim submissions.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/:id/benefits_check` — Trigger Silna benefits checks for an existing practitioner-view insurance policy.
  - Params: `specialties[] (Silna specialty codes), idempotency_key`
  - Response: { benefits_check_ids, policy_id, errors: [] }
  - Note: Requires OrganizationPolicy.manage_insurance_policies_check?. Organization must have insurance claims enabled. Enqueues Silna polling jobs for each created benefits check id.
- `GET /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/:id/silna_eligibility_check` — Fetch latest realtime Silna eligibility-check status for practitioner-managed policy.
  - Params: `none`
  - Response: { benefits_check, possible_out_of_date, errors: [] }
  - Note: Requires PatientPolicy.show? and insurance_claims_enabled. possible_out_of_date is true when latest check predates current month.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/:id/silna_eligibility_check` — Trigger Silna realtime eligibility check for practitioner-managed policy.
  - Params: `specialties[], idempotency_key`
  - Response: { benefits_check_ids, policy_id, errors: [] }
  - Note: Requires PatientPolicy.update_related_data? and insurance_claims_enabled. Creates realtime-template benefits checks and enqueues Silna polling jobs.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/insurance_policies/extract_ocr_from_upload` — Extract insurance card fields from uploaded front-card image for practitioner workflow.
  - Params: `front_card* (image file)`
  - Response: { ocr_data: { extracted_data, errors }, errors: [] }
  - Note: Requires PatientPolicy.update_related_data?. Uses InsuranceCardOcrUploadService and rejects non-image uploads.
- `PATCH /api/v1/patients/:patient_id/insurance_policies/:id/caregiver` — Update caregiver-managed insurance policy fields and optional card attachments.
  - Params: `policy[member_number], policy[group_number], policy[plan_order_number], policy[insurance_plan_id], policy[insurance_type], policy[start_date], policy[end_date], policy[priority_type], policy[subscriber_first_name], policy[subscriber_last_name], policy[subscriber_date_of_birth], policy[subscriber_gender], policy[subscriber_relationship_to_patient], policy[insurance_card_front], policy[insurance_card_back]`
  - Response: { policy: { ...insurance policy... }, errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.update?. Validates card image mime types and propagates updated policies across workspace.
- `DELETE /api/v1/patients/:patient_id/insurance_policies/:id/caregiver` — Delete caregiver-managed insurance policy.
  - Params: `none`
  - Response: { policy: { deleted: true }, errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.update?. Deletion is blocked when policy has linked encounter claim submissions (returns 422 with delete_disabled_reason).
- `POST /api/v1/patients/:patient_id/insurance_policies/:id/caregiver_realtime_eligibility_check` — Run realtime Candid eligibility check for a caregiver-visible policy.
  - Params: `organization_participant_id*`
  - Response: { eligibility_check }
  - Note: Requires current_user caregiver and PatientPolicy.update?. Selected organization_participant must exist and have practitioner with NPI. Uses EligibilityChecks::CreateService and returns parsed Candid errors on failures.
- `GET /api/v1/patients/:patient_id/insurance_policies/:id/plan_status` — Fetch Silna insurance plan status snapshot for a caregiver-visible policy.
  - Params: `none`
  - Response: { plan_status, errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.show?. Uses Silna::InsurancePlanStatusService, which may sync patient/policy to Silna before returning plan_eligibility_status and latest check fields.
- `GET /api/v1/patients/:patient_id/insurance_policies/caregiver` — List caregiver-visible insurance policies for a patient.
  - Params: `none`
  - Response: { policies: [{ id, external_silna_id, member_number, group_number, plan_order_number, insurance_type, start_date, end_date, priority_type, insurance_plan, subscriber_first_name, subscriber_last_name, subscriber_date_of_birth, subscriber_gender, subscriber_relationship_to_patient, card_front_url, card_back_url, card_front_filename, card_back_filename, latest_eligibility_check, linked_to_encounter_insurance_claim_submissions, can_delete, delete_disabled_reason }], errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.show?. Includes linked-claim metadata for deletion rules.
- `POST /api/v1/patients/:patient_id/insurance_policies/caregiver` — Create caregiver-managed insurance policy for a patient.
  - Params: `policy[member_number]*, policy[group_number], policy[plan_order_number], policy[insurance_plan_id]*, policy[insurance_type], policy[start_date], policy[end_date], policy[priority_type], policy[subscriber_first_name]*, policy[subscriber_last_name]*, policy[subscriber_date_of_birth]*, policy[subscriber_gender]*, policy[subscriber_relationship_to_patient]*, policy[insurance_card_front], policy[insurance_card_back]`
  - Response: { policy: { ...insurance policy... }, errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.update? on patient. Enforces single primary policy, validates uploaded images, propagates policy changes across workspace patients asynchronously.
- `POST /api/v1/patients/:patient_id/insurance_policies/extract_ocr_from_upload` — Extract insurance card fields from uploaded front-card image using OCR.
  - Params: `front_card* (image file)`
  - Response: { ocr_data: { extracted_data, errors }, errors: [] }
  - Note: Requires current_user caregiver and PatientPolicy.update?. Uses InsuranceCardOcrUploadService (Gemini OCR). Non-image uploads are rejected.
- `GET /api/v1/patients/:patient_id/insurance_policies/practitioner_benefits_checks` — Return practitioner-policy benefits checks from organization-owned patients in the caregiver patient's workspace.
  - Params: `none`
  - Response: { insurance_details: [{ policy_id, silna_benefits_check_id, payor_name, insurance_number, benefits_checks }], errors: [] }
  - Note: Requires current_user caregiver, PatientPolicy.show?, and PatientPolicy.view_insurance_details?. Aggregates benefits checks for insurance-claims-enabled organizations in workspace.

---

## Payment Methods

- `GET /api/v1/organizations/:organization_id/patients/:patient_id/payment_methods` — List payment methods configured for one organization-owned patient.
  - Params: `none`
  - Response: { payment_methods: Array<{ ...PatientPaymentMethodSerializer fields... }> }
  - Note: Requires PatientPolicy.view_payment_methods? and organization-patient ownership validation against organization_id. Returns active methods ordered primary-first, then newest-first.
- `DELETE /api/v1/organizations/:organization_id/patients/:patient_id/payment_methods/:id` — Remove one provider-managed payment method from an organization-owned patient.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Requires PatientPolicy.delete_payment_methods_provider? and organization-patient ownership validation. Blocks deletion of caregiver-created methods, soft-deletes the record after Stripe detachment, and promotes fallback primary when deleting the primary method.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/payment_methods/:id/set_primary` — Set a specific organization-patient payment method as that patient's primary charge target.
  - Params: `none`
  - Response: { success }
  - Note: Requires PatientPolicy.update_payment_methods_provider? and organization-patient ownership validation. Payment method must belong to the patient and have succeeded status; demotes existing primary method before promoting selected method.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/payment_methods/create_from_setup_intent` — Create an organization-patient payment method from a confirmed SetupIntent in provider workflows.
  - Params: `billing_name*, billing_email*, setup_intent_id*, set_primary (boolean)`
  - Response: { success, payment_method: { ...PatientPaymentMethodSerializer fields... }, group_uuid }
  - Note: Requires PatientPolicy.create_payment_methods_provider? and organization-patient ownership validation against organization_id. Rejects ACH methods when org ACH capability is disabled and clones succeeded methods to the connected account.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/payment_methods/create_setup_intent` — Create a SetupIntent for provider-managed payment-method collection on an organization-owned patient.
  - Params: `none`
  - Response: { client_secret, setup_intent_id, customer_id, has_ach_capability }
  - Note: Requires PatientPolicy.create_payment_methods_provider? and organization-patient ownership validation. Organization must have a connected Stripe account.
- `GET /api/v1/patients/:patient_id/payment_methods` — List grouped payment methods visible in a caregiver-managed workspace patient context.
  - Params: `none`
  - Response: { payment_method_groups: Array<{ id, group_uuid, owner_type, type, display_details, billing_name, billing_email, status, is_primary, present_on_all, present_on_patient_count, created_at, organizations, caregiver_id, caregiver_name, can_delete }> }
  - Note: Requires PatientPolicy.view_payment_methods? and caregiver-workspace patient context. Prefers grouped organization-patient payment methods when present; otherwise falls back to caregiver-owned method groups with consent filtering.
- `POST /api/v1/patients/:patient_id/payment_methods/bulk_create_from_setup_intents` — Create a synchronized payment-method group across multiple organization-owned patients from one confirmed Stripe SetupIntent.
  - Params: `billing_name*, billing_email*, setup_intent_id*, patient_ids* (Array<Integer>), set_primary (boolean)`
  - Response: { success, payment_methods: Array<{ ...PatientPaymentMethodSerializer fields... }>, group_uuid }
  - Note: Requires PatientPolicy.create_payment_methods? on the route patient and caregiver-workspace patient context. Validates SetupIntent, reuses or creates Stripe metadata group_uuid, clones to each target org connected account, and skips ACH methods for orgs that are not ACH capable.
- `DELETE /api/v1/patients/:patient_id/payment_methods/bulk_destroy` — Remove a grouped payment method from all linked organization patients in the workspace.
  - Params: `group_uuid*`
  - Response: HTTP 204 No Content
  - Note: Requires PatientPolicy.can_delete_payment_methods? and caregiver-workspace patient context. Soft-deletes each grouped record, detaches connected-account Stripe clones when present, and promotes fallback primary methods for affected patients that lost their primary.
- `POST /api/v1/patients/:patient_id/payment_methods/caregiver_create_from_setup_intent` — Save a caregiver-owned payment method from a confirmed SetupIntent for marketplace and caregiver billing flows.
  - Params: `caregiver_id*, billing_name*, billing_email*, setup_intent_id*`
  - Response: { success, payment_method: { ...CaregiverPaymentMethodSerializer fields... }, group_uuid }
  - Note: Requires PatientPolicy.create_payment_methods? on the route patient plus caregiver workspace checks. Caregiver must belong to the workspace with granted consent, have payment-method permissions, and cannot be a care navigator; acting user must be the same caregiver or a care navigator managing them.
- `DELETE /api/v1/patients/:patient_id/payment_methods/caregiver_destroy` — Delete a caregiver-owned payment method group.
  - Params: `group_uuid*`
  - Response: HTTP 204 No Content
  - Note: Authorization is enforced by CaregiverPaymentMethodPolicy.delete? on the first method in the group. Detaches each grouped platform Stripe payment method and soft-deletes all matching CaregiverPaymentMethod rows.
- `GET /api/v1/patients/:patient_id/payment_methods/caregiver_marketplace_payment_method` — Resolve the payment method a caregiver can use for marketplace booking checkout.
  - Params: `none`
  - Response: { payment_method } where payment_method is PatientPaymentMethodSerializer or null
  - Note: Caregiver-only endpoint for organization-owned patients. If caregiver can view provider-managed methods, selects deterministic charge method via PatientPaymentMethod.select_for_charge; otherwise falls back to caregiver-created methods when available.
- `POST /api/v1/patients/:patient_id/payment_methods/caregiver_setup_intent` — Create a Stripe SetupIntent for a specific caregiver so they can add a caregiver-owned payment method.
  - Params: `caregiver_id*`
  - Response: { setup_intent: { caregiver_id, customer_id, setup_intent_id, client_secret } }
  - Note: Requires PatientPolicy.create_payment_methods? on the route patient plus caregiver workspace checks. Target caregiver must be a consented caregiver member, have payment-method permissions on the patient, and cannot be a care navigator; acting user must be the same caregiver or a care navigator.
- `GET /api/v1/patients/:patient_id/payment_methods/eligible_caregivers` — Return consented caregiver members who are allowed to own payment methods for the patient's workspace.
  - Params: `none`
  - Response: { caregivers: Array<{ id, name, email }> }
  - Note: Care-navigator helper endpoint. Requires caregiver-workspace patient context, care_navigator caller, and PatientPolicy.create_payment_methods? on the route patient. Filters to workspace caregiver memberships with satisfied consent and excludes care navigators.
- `POST /api/v1/patients/:patient_id/payment_methods/set_group_primary` — Mark a workspace payment-method group as primary across all affected organization patients.
  - Params: `group_uuid*`
  - Response: { success }
  - Note: Requires PatientPolicy.update_payment_methods? and caregiver-workspace patient context. Rejects caregiver-owned groups and groups containing non-succeeded methods, then demotes existing primaries on affected patients and promotes all group records.
- `POST /api/v1/patients/:patient_id/payment_methods/setup_intents` — Create one SetupIntent that can be reused to add the same payment method across all eligible organization-owned patients in a workspace.
  - Params: `none`
  - Response: { setup_intent: { patient_id, customer_id, setup_intent_id, client_secret }, patient_ids, ach_capable_patient_ids, workspace_has_ach_capable_orgs }
  - Note: Requires PatientPolicy.create_payment_methods? and caregiver-workspace patient context. Builds eligibility from org-owned workspace patients with connected accounts, and enables us_bank_account setup only when at least one eligible org is ACH capable.

---

## Encounter Invoices

- `DELETE /api/v1/encounter_invoices/:id` — Delete an invoice that has not progressed to non-deletable states.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires OrganizationPolicy.invalidate_invoices? on invoice.organization. Uses Invoices::DeleteEncounterInvoice, which only allows status draft/open and rejects invoices with any payment attempts.
- `POST /api/v1/encounter_invoices/:id/caregiver_charge` — Charge an invoice immediately using the caregiver patient's stored payment method.
  - Params: `none`
  - Response: { invoice: { id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] }, fully_charged }
  - Note: Requires PatientPolicy.manage_invoices? on invoice.patient. Invoice must be chargeable (open/partially_paid with remaining balance). Charges through Invoices::StripeCharge and returns fully_charged=true when remaining balance reaches zero.
- `POST /api/v1/encounter_invoices/:id/generate_pdf` — Generate and attach a fresh invoice PDF reflecting current invoice status and payment history.
  - Params: `none`
  - Response: { pdf_url, invoice_id }
  - Note: Requires OrganizationPolicy.charge_customers? on invoice.organization. Always regenerates via InvoicePdfService before returning URL; returns 500 when attachment fails.
- `POST /api/v1/encounter_invoices/:id/manual_charge` — Trigger a manual immediate charge attempt for an invoice from practitioner billing workflows.
  - Params: `none`
  - Response: { invoice: { id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] }, fully_charged }
  - Note: Authorizes PatientEncounterPolicy.charge_customers? using the invoice's first linked encounter. Requires invoice chargeable state and no pending payment records. Uses Invoices::StripeCharge and returns fully_charged=true when balance reaches zero.
- `POST /api/v1/encounter_invoices/:id/retry_charge` — Retry charging an invoice after previous payment failures.
  - Params: `none`
  - Response: { invoice: { id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] }, fully_charged }
  - Note: Authorizes PatientEncounterPolicy.charge_customers? using first invoice encounter. Requires chargeable invoice, at least one failed payment, and no pending payment. Uses Invoices::StripeCharge for retry attempt.
- `POST /api/v1/encounter_invoices/:id/void` — Void an invoice when correction is needed and no successful payments have occurred.
  - Params: `none`
  - Response: { invoice: { id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] } }
  - Note: Requires OrganizationPolicy.invalidate_invoices? on invoice.organization. Uses Invoices::VoidEncounterInvoice, which only allows open invoices where payment attempts exist and all are failed.
- `GET /api/v1/patients/:patient_id/invoices/caregiver_index` — List invoices visible to a caregiver across patients in the same workspace.
  - Params: `include_paid (boolean), include_voided (boolean), appointment_id, page, per_page`
  - Response: { invoices: [{ id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] }], pagy: { page, items, pages, count, prev, next } }
  - Note: Requires PatientPolicy.manage_invoices? on requested patient. Internally loads invoices for all organization patients in the same workspace. By default excludes paid and void invoices unless include_paid/include_voided are true.
- `GET /api/v1/patients/:patient_id/invoices/practitioner_index` — List invoices for an organization-owned patient in practitioner billing views.
  - Params: `invoice_status (draft|open|partially_paid|paid|void), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), page, per_page`
  - Response: { invoices: [{ id, status, amount_total_cents, amount_paid_cents, amount_remaining_cents, issued_at, due_date, paid_at, voided_at, dates_of_service_start, dates_of_service_end, practice, payment_method_preview, auto_chargeable, organization_billing_active, pdf_url, line_items: [...], payments: [...] }], pagy: { page, items, pages, count, prev, next } }
  - Note: Requires BILLING_TAB LaunchDarkly flag, patient with created_by_organization_id, and OrganizationPolicy.charge_customers?. Optional date filters are applied against linked appointment start_time.

---

## Encounter Invoice Payments

- `POST /api/v1/encounter_invoice_payments/:id/refund` — Issue a Stripe refund for an encounter invoice payment.
  - Params: `none`
  - Response: { id, status, amount_cents, succeeded_at, attempted_at, applied_to_invoice_at, external_stripe_status, refund_amount_cents, refund_failure_reason, refund_pending_reason, patient_payment_method, refunded_at, error_code, error_message, encounter_invoice_id, patient_name, organization_name, invoice_details }
  - Note: Requires EncounterInvoicePaymentPolicy.refund? (`manage_refunds` permission on the payment's organization). Uses Invoices::StripeRefund and enforces refundable states (typically succeeded payments, with guarded retry paths).
- `GET /api/v1/patients/:patient_id/payments` — List invoice payment attempts across the caregiver's patient workspace.
  - Params: `status, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), organization_id, sort_by (attempted_at|succeeded_at|amount_cents), sort_direction (asc|desc), page, per_page`
  - Response: { payments: [{ id, status, amount_cents, succeeded_at, attempted_at, applied_to_invoice_at, external_stripe_status, refund_amount_cents, refund_failure_reason, refund_pending_reason, patient_payment_method, refunded_at, error_code, error_message, encounter_invoice_id, patient_name, organization_name, invoice_details }], pagy: { page, items, pages, count, prev, next } }
  - Note: Requires PatientPolicy.manage_invoices? on the requested patient. Internally scopes to all organization-owned patients in the same workspace. Returns 422 when patient has no workspace.

---

## Patient Intake Forms

- `GET /api/v1/patients/:patient_id/patient_intake_forms/:id` — Fetch patient intake form by intake_type.
  - Params: `none`
  - Response: { id, patient_id, intake_type, form_data, last_submitted_at }
  - Note: Requires PatientPolicy.view_intake?. Route id segment is intake_type string (not DB id). For org-owned patient without local form, endpoint falls back to caregiver-managed primary patient form in same workspace.
- `POST /api/v1/patients/:patient_id/patient_intake_forms/upsert` — Create or overwrite a patient's intake form submission for a specific intake type.
  - Params: `patient_intake_form[intake_type]*, patient_intake_form[form_data]* (object)`
  - Response: { id, patient_id, intake_type, form_data, last_submitted_at }
  - Note: Requires PatientPolicy.upsert_intake? (caregiver-only). Upserts by the unique patient and intake_type pair, stamps last_submitted_at to now, writes mapped external Healthie template ID, and enqueues RecordPatientIntakeContactSnapshotJob for caregiver-owned patients.

---

## AI Goal Conversations

- `GET /api/v1/patients/:patient_id/ai_goal_conversations` — List all AI goal conversations for a patient belonging to the current user, ordered by most recent activity first.
  - Params: `none`
  - Response: Array of { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, patient: { id, first_name, last_name, ... }, user: { id, first_name, last_name, ... }, ai_goal_messages: [{ id, role, content, metadata, created_at }] }
  - Note: Only returns conversations owned by the current user for the given patient. Includes all messages (eager loaded). User must have "view Goal" permission in the patient's workspace.
- `POST /api/v1/patients/:patient_id/ai_goal_conversations` — Start a new AI goal conversation for a patient. Uses Gemini to generate goal suggestions based on the patient's profile and the user's input.
  - Params: `initial_message`
  - Response: { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, patient: { id, first_name, last_name, name, date_of_birth, workspace_id }, user: { id, first_name, last_name, name, email }, ai_goal_messages: [{ id, role, content, metadata, created_at }] }
  - Note: Automatically completes any existing active conversation for this user+patient before creating the new one. Only one active conversation per user per patient is allowed. The user must have "create Goal" permission.
- `GET /api/v1/patients/:patient_id/ai_goal_conversations/:id` — Fetch a single AI goal conversation with full message history and current suggestion state. Used when reopening an existing conversation thread.
  - Params: `none`
  - Response: { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, created_at, updated_at, patient: { id, first_name, last_name, name, date_of_birth, workspace_id }, user: { id, first_name, last_name, name, email }, ai_goal_messages: [{ id, role, content, metadata, created_at, updated_at }] }
  - Note: Requires "view Goal" permission in the patient's workspace and conversation ownership (record.user_id must equal current_user.id).
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/abandon` — Mark an AI goal conversation as abandoned. Use when the user wants to discard the conversation without saving the suggested goal.
  - Params: `none`
  - Response: { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, patient: { id, first_name, last_name, name, date_of_birth, workspace_id }, user: { id, first_name, last_name, name, email }, ai_goal_messages: [{ id, role, content, metadata, created_at }] }
  - Note: Conversation must be owned by the current user. Status changes to "abandoned". Only works on active conversations.
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/complete` — Mark an AI goal conversation as completed. Use when the user is satisfied with the suggested goal and wants to finalize the conversation.
  - Params: `none`
  - Response: { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, patient: { id, first_name, last_name, name, date_of_birth, workspace_id }, user: { id, first_name, last_name, name, email }, ai_goal_messages: [{ id, role, content, metadata, created_at }] }
  - Note: Conversation must be owned by the current user. Status changes to "completed". Does not automatically create a Goal record — the goal suggestion in current_goal_suggestion must be used separately to create an actual goal.
- `POST /api/v1/patients/:patient_id/ai_goal_conversations/:id/send_message` — Append a user message to an existing AI goal conversation and generate a new assistant reply with an updated goal suggestion. Use this to iteratively refine goal language after the initial draft.
  - Params: `message[content]*`
  - Response: { id, status, current_goal_suggestion, goal_suggestions, last_activity_at, created_at, updated_at, patient: { id, first_name, last_name, name, date_of_birth, workspace_id }, user: { id, first_name, last_name, name, email }, ai_goal_messages: [{ id, role, content, metadata, created_at, updated_at }] }
  - Note: Conversation must be owned by the current user and user must have "update Goal" permission in the patient's workspace. Adds the user message, optionally inserts an acknowledgment assistant message for revision-style follow-ups, then appends an assistant message whose metadata contains the new goal suggestion. On AI generation failure, an error assistant message is still appended and the endpoint returns 200 with the updated conversation.
- `GET /api/v1/patients/:patient_id/ai_goal_conversations/sample_prompts` — Return starter prompts for goal-writing conversations for a specific patient. Used by clients to prefill common goal themes before the user writes a custom prompt.
  - Params: `none`
  - Response: { sample_prompts: [{ id, title, prompt }] }
  - Note: Requires access to the patient via PatientPolicy.show?. Prompts are static templates returned by AiGoalCreationService; this endpoint does not create a conversation or call Gemini.

---

## Referring Physicians

- `GET /api/v1/patients/:patient_id/referring_physicians` — List referring physicians linked to a patient.
  - Params: `none`
  - Response: Array of { ...ReferringPhysicianSerializer fields... }
  - Note: Requires PatientPolicy.show? on the parent patient.
- `POST /api/v1/patients/:patient_id/referring_physicians` — Add a referring physician contact to a patient record.
  - Params: `referring_physician[first_name]*, referring_physician[last_name]*, referring_physician[email], referring_physician[phone], referring_physician[phone_extension], referring_physician[practice_name]`
  - Response: { ...ReferringPhysicianSerializer fields... }
  - Note: Requires PatientPolicy.update? on the parent patient.
- `PUT|PATCH /api/v1/patients/:patient_id/referring_physicians/:id` — Update an existing referring physician contact for a patient.
  - Params: `referring_physician[first_name], referring_physician[last_name], referring_physician[email], referring_physician[phone], referring_physician[phone_extension], referring_physician[practice_name]`
  - Response: { ...ReferringPhysicianSerializer fields... }
  - Note: Requires PatientPolicy.update? on the parent patient.
- `DELETE /api/v1/patients/:patient_id/referring_physicians/:id` — Remove a referring physician contact from a patient.
  - Params: `none`
  - Response: { message }
  - Note: Requires PatientPolicy.update? on the parent patient.

---

## Diagnoses

- `GET /api/v1/organizations/:organization_id/patients/:patient_id/diagnoses` — List diagnoses for a patient within an organization context.
  - Params: `none`
  - Response: { diagnoses: [{ id, active, primary, end_date, first_symptom_date, updated_at, linked_to_clinical_notes, icd_code: { ... } }], errors: [] }
  - Note: Practitioner-only, requires PatientPolicy.show? plus EHR/VMG full and active org membership. Results are ordered primary desc, active desc, created_at desc.
- `POST /api/v1/organizations/:organization_id/patients/:patient_id/diagnoses` — Create or upsert a diagnosis for a patient in an organization.
  - Params: `diagnosis[icd_code_id]*, diagnosis[active], diagnosis[primary], diagnosis[end_date], diagnosis[first_symptom_date] OR legacy diagnoses[][icd_code_id]* + same optional fields`
  - Response: { diagnosis: { id, active, primary, end_date, first_symptom_date, updated_at, linked_to_clinical_notes, icd_code: { ... } }, errors: [] } OR legacy { diagnoses: [{ ... }], errors: [] }
  - Note: Practitioner-only, requires PatientPolicy.update_related_data? plus EHR/VMG full and active org membership. Upserts by patient+organization+icd_code. New records default active=true and primary=false unless explicitly provided.
- `PUT|PATCH /api/v1/organizations/:organization_id/patients/:patient_id/diagnoses/:id` — Update mutable diagnosis fields for an existing diagnosis.
  - Params: `diagnosis[active], diagnosis[primary], diagnosis[end_date], diagnosis[first_symptom_date]`
  - Response: { diagnosis: { id, active, primary, end_date, first_symptom_date, updated_at, linked_to_clinical_notes, icd_code: { ... } }, errors: [] }
  - Note: Practitioner-only, requires PatientPolicy.update_related_data? plus EHR/VMG full and active org membership. icd_code cannot be changed via update.
- `DELETE /api/v1/organizations/:organization_id/patients/:patient_id/diagnoses/:id` — Delete a diagnosis from a patient record.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Practitioner-only, requires PatientPolicy.update_related_data? plus EHR/VMG full and active org membership. Deletion is blocked when diagnosis is linked to clinical notes; returns 422 with guidance to mark diagnosis inactive instead.

---

## Superbills

- `GET /api/v1/patients/:patient_id/superbills` — List downloadable superbills for one patient in an organization context.
  - Params: `start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), page, per_page, limit`
  - Response: { superbills: Array<{ id, pdf_url, created_at }>, pagy: { page, items, pages, count, prev, next } }
  - Note: Requires SUPERBILLS feature flag, patient organization ownership, and OrganizationPolicy.billing_dashboard? on patient.created_by_organization. Only superbills with attached PDFs are returned.
- `POST /api/v1/superbills` — Generate and store a superbill PDF for selected paid cash-pay appointments within an organization.
  - Params: `organization_id*, appointment_ids* (Array<Integer>), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)`
  - Response: { id, pdf_url, patient_id, appointments_count, total_amount, created_at }
  - Note: Requires SUPERBILLS LaunchDarkly flag, EHR/VMG full active org membership, and OrganizationPolicy.billing_dashboard?. All appointments must be cash-pay, payment-succeeded, CPT-coded, and for the same patient.
- `DELETE /api/v1/superbills/:id` — Delete an existing superbill record and its generated artifact.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Requires SUPERBILLS feature flag, EHR/VMG full active org membership, OrganizationPolicy.billing_dashboard?, and SuperbillPolicy.destroy?.
- `GET /api/v1/superbills/services` — Return paid cash-pay encounters and CPT services eligible to be bundled into a new superbill.
  - Params: `organization_id*, patient_id, status, appointment_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)`
  - Response: { encounters: Array<{ appointment_id, appointment_start_time, patient_id, on_existing_superbills, appointment, care_services, paid_amount }> }
  - Note: Requires SUPERBILLS feature flag, EHR/VMG full active org membership, and OrganizationPolicy.billing_dashboard?. Includes only encounters with successful cash payment and at least one CPT-coded care service.

---

## Appointments

- `PATCH /api/v1/appointments/:id/caregiver_cancel` — Cancel a future scheduled appointment from the caregiver side and persist a cancellation reason.
  - Params: `cancellation_reason_code* ("schedule_issues"|"location_issues"|"payment_issues"|"not_good_fit"|"no_longer_needed"|"other"), note`
  - Response: { appointment: { id, start, end, notes, appointment_type_name, appointment_type_length, appointment_type_id, contact_type, contact_type_label, status, external_zoom_meeting_link, is_initial_consultation, contact_phone_number, patient_payment_type_override, patient: { ... }, organization: { ... }, practitioner: { ... }, recurring, recurring_appointment, address, can_delete, encounter_completed, can_change_patient, cancellation_reason_code }, errors: [] }
  - Note: Caregiver-only endpoint. Appointment must exist, be `scheduled`, and start in the future. Access is validated against the appointment patient (or linked caregiver patient via match request). Cancellation status becomes `late_client_cancel` when start_time is within 24 hours, otherwise `cancelled`. note (if present) overwrites appointment notes.
- `GET /api/v1/appointments/:id/caregiver_show` — Fetch full caregiver-facing details for a single appointment, including recurring metadata and linked patient/caregiver/provider context.
  - Params: `none`
  - Response: { appointment: { id, start, end, notes, appointment_type_name, appointment_type_length, appointment_type_id, contact_type, contact_type_label, status, external_zoom_meeting_link, is_initial_consultation, contact_phone_number, patient_payment_type_override, patient: { id, first_name, last_name, avatar_url, owned_by_organization_id, workspace_id, default_encounter_payment_type, has_insurance_policies, has_payment_methods, caregivers: [...] }, organization: { id, name, avatar_url, insurance_claims_enabled }, practitioner: { id, first_name, last_name, org_participant_id, avatar_url, user_id }, recurring, recurring_appointment, address, can_delete, encounter_completed, can_change_patient, cancellation_reason_code }, errors: [] }
  - Note: Caregiver-only endpoint. Appointment is accessible when caregiver can view appointment.patient directly or can view the caregiver patient linked through appointment.match_request. Returns 404 when id is missing/not found.
- `GET /api/v1/appointments/:id/history` — Return audit history for an appointment timeline, including tracked appointment changes and related care-service changes.
  - Params: `page, per_page`
  - Response: { history_entries: [{ id, event_type, changed_by: { id, name, email, avatar_url } | nil, changed_at, changes: [{ field, field_label, field_type, old_value, new_value, old_value_display, new_value_display }], context: { type, label, id } | nil }], pagy: { page, items, pages, count, prev, next }, error }
  - Note: Requires AppointmentPolicy.view_history? permission (`view_appointment_history` on Organization). Organization must be on EHR_FULL/VMG_FULL plan. Includes both Appointment and CareService PaperTrail versions filtered to whitelisted fields, newest first. Missing id returns 404.
- `GET /api/v1/appointments/:id/ics` — Generate an iCalendar (.ics) event payload for a single appointment so clients can add it to device calendars.
  - Params: `none`
  - Response: text/calendar body (ICS file content)
  - Note: Requires AppointmentPolicy.view? access to the appointment. On success, response is plain text/calendar (not JSON). Returns 404 if appointment is missing and 500 if ICS generation fails.
- `DELETE /api/v1/appointments/:id/practitioner_delete` — Delete a practitioner appointment, optionally deleting this and future appointments in its recurring series.
  - Params: `delete_recurring (query boolean; "true" deletes current+future in series, default false)`
  - Response: { appointment: { deleted: true }, errors: [] }
  - Note: Requires AppointmentPolicy.destroy? permission, practitioner context, and active EHR_FULL/VMG_FULL org membership. Appointment must be deletable (encounter nil/empty); if encounter contains documentation, returns 422 with \"Cannot delete appointment with existing session documentation\". Recurring behavior — delete_recurring=true deletes from current series position forward; delete_recurring=false on an anchor deletes only the anchor and re-anchors the series to the next occurrence. If some future occurrences are non-deletable, they remain and series metadata is rebalanced. Missing id returns 404.
- `GET /api/v1/appointments/:id/practitioner_show` — Fetch full practitioner-facing details for one appointment, including patient, caregivers, organization, practitioner, and recurring metadata.
  - Params: `none`
  - Response: { appointment: { id, start, end, notes, appointment_type_name, appointment_type_length, appointment_type_id, contact_type, contact_type_label, status, external_zoom_meeting_link, is_initial_consultation, contact_phone_number, patient_payment_type_override, patient: { id, first_name, last_name, avatar_url, owned_by_organization_id, workspace_id, default_encounter_payment_type, has_insurance_policies, has_payment_methods, caregivers: [...] }, organization: { id, name, avatar_url, insurance_claims_enabled }, practitioner: { id, first_name, last_name, org_participant_id, avatar_url, user_id }, recurring, recurring_appointment, address, can_delete, encounter_completed, can_change_patient, cancellation_reason_code }, errors: [] }
  - Note: Requires AppointmentPolicy.view? permission, practitioner context, and active EHR_FULL/VMG_FULL org membership. notes field may come from summarized initial-request notes for initial-consult appointments tied to a match_request. can_delete reflects whether the encounter is empty. Current behavior returns a generic 500 error for missing/nonexistent id (not a 404-specific payload).
- `PUT /api/v1/appointments/:id/practitioner_update` — Update practitioner appointment details (time, provider, contact type, status, notes, type, payment override), optionally applying updates across a recurring series.
  - Params: `appointment_type_id, contact_type ("In Person"|"Phone Call"|"Secure Videochat"), start_time (datetime string), timezone (IANA timezone; required when start_time is sent), notes, update_recurring (boolean), address, status, patient_payment_type_override ("cash"|"insurance"), org_participant_id`
  - Response: { appointment: { id }, errors: [] }
  - Note: Requires AppointmentPolicy.update? permission, practitioner context, and active EHR_FULL/VMG_FULL org membership. patient_id changes are explicitly rejected. org_participant_id reassignment requires same-organization provider, active provider status, patient access, and (when acting for another provider) org owner/admin rights. update_recurring=true updates this-and-future occurrences; status updates are blocked in that mode. Changing contact_type enqueues Zoom create/delete jobs. If encounter is completed, patient_payment_type_override changes are ignored; insurance override still requires insurance_claims_enabled. Missing id returns 404.
- `GET /api/v1/appointments/caregiver_index` — List caregiver-facing appointments for a patient over a date range, including appointments stored on related organization patient records for the same person.
  - Params: `patient_id*, start_date*, end_date*, with_billing_info (boolean), billing_status ("unpaid"|"paid"|"partial")`
  - Response: { appointments: [{ id, start, end, status, contact_type, contact_type_label, address, appointment_type_name, appointment_type_length, appointment_type_id, patient: { id, first_name, last_name, avatar_url }, organization: { id, name, avatar_url }, practitioner: { id, first_name, last_name, avatar_url, org_participant_id }, amount_due, amount_paid, billing_status, insurance_pending }], errors: [] }
  - Note: Caregiver-only endpoint. patient_id/start_date/end_date are required; dates are parsed with Date.parse. Query expands to related patient IDs (same-workspace org patients + accepted match-request appointment patients). billing_status filter requires with_billing_info=true.
- `GET /api/v1/appointments/caregiver_next` — Return the next upcoming scheduled appointment for a caregiver patient, searching across related patient records when appointments are stored on org-owned duplicates.
  - Params: `patient_id*`
  - Response: { appointment: { id, start, end, status, contact_type, contact_type_label, address, appointment_type_name, appointment_type_length, appointment_type_id, patient: { id, first_name, last_name, avatar_url }, organization: { id, name, avatar_url }, practitioner: { id, first_name, last_name, avatar_url, org_participant_id }, amount_due, amount_paid, billing_status, insurance_pending } | nil, errors: [] }
  - Note: Caregiver-only endpoint. patient_id is required and must be viewable via PatientPolicy.show?. Only `scheduled` appointments with start_time >= now are considered; earliest start_time is returned. Billing fields are always null in this endpoint (with_billing_info=false).
- `POST /api/v1/appointments/practitioner_create` — Create a practitioner appointment for an organization patient, with optional recurring-series creation.
  - Params: `organization_id*, org_participant_id*, patient_id*, appointment_type_id*, start_time* (datetime string), timezone* (IANA timezone), contact_type ("In Person"|"Phone Call"|"Secure Videochat"), notes, address, patient_payment_type_override ("cash"|"insurance"), recurring_params[repeat_interval], recurring_params[repeat_times]`
  - Response: { appointment: { id }, errors: [] }
  - Note: Requires organization-level create_appointment permission, practitioner context, and active org membership in an EHR_FULL/VMG_FULL org. org_participant_id must belong to organization_id and must be allowed to access patient_id; non-admin/non-owner users cannot act on behalf of another provider. start_time is parsed using timezone and stored in UTC. recurring_params creates a series (anchor + future occurrences) and supports Weekly/Biweekly/Monthly/Every 4 Weeks; if future occurrence generation fails, the anchor+series still persist and reconciliation is queued. If contact_type is Secure Videochat, Zoom meeting creation is enqueued. If patient_payment_type_override is insurance, organization insurance claims must be enabled. Success is 200; missing records are 404; missing timezone is 422; some malformed/missing inputs currently surface as generic 500.
- `GET /api/v1/appointments/practitioner_index` — List practitioner appointments in a date window for calendar view or paginated list view, with optional provider/org/patient/type/contact filters.
  - Params: `start_date*, end_date* (ISO date), organization_id, org_participant_id, appointment_type_id, contact_type, patient_id, include_blocks (boolean), status_group (upcoming|past|cancelled), page, per_page`
  - Response: Calendar mode (no page/per_page): { appointments: [{ id, start, end, appointment_type_name, appointment_type_length, appointment_type_id, contact_type, contact_type_label, status, patient, organization, practitioner } (+ blocker rows if include_blocks=true)], errors: [] }. Paginated mode (page or per_page present): { appointments: [same shape, non-blockers only], pagy: { page, items, pages, count, prev, next }, status_counts: { upcoming, past, cancelled }, errors: [] }
  - Note: Practitioner-only endpoint. start_date/end_date are required and invalid/missing filters return 400 via errors array. appointment_type_id filtering requires organization_id. In paginated mode, status_group defaults to upcoming; status_group is ignored in calendar mode. Cancelled appointments contribute to cancelled count and are also categorized into upcoming/past by start time. include_blocks only affects calendar mode output; paginated mode strips blocker rows. per_page defaults to 20 and is capped at 100. Scope is permission-aware (admins can query broader provider scope in their admin orgs).
- `GET /api/v1/appointments/recent_addresses` — Return recently used appointment addresses for a provider to speed up scheduling form entry.
  - Params: `org_participant_id*`
  - Response: { addresses: ["..."] }
  - Note: Requires organization create_appointment permission for the provider's organization and org plan access (EHR_FULL or VMG_FULL). Returns up to 5 most recently updated non-empty addresses for that org_participant_id, with duplicates removed.
- `GET /api/v1/organizations/:organization_id/appointments/status_report` — Build an organization appointment operations report (metrics + paginated detail rows) for a date range, with optional provider/status/payment/insurance/type filters.
  - Params: `start_date*, end_date*, page, per_page, org_participant_id, timezone, appointment_status[] (Appointment::Status values), payment_type[] ("insurance"|"cash"), appointment_type_id[] (org/global appointment type ids), insurance_plan_ids[]`
  - Response: { report: { filters, period_metrics, appointments_per_patient, trends, provider_analytics, insurance_distribution, appointment_status_distribution, rows: [{ appointment_id, start_time, end_time, appointment_status, status, appointment_type_id, appointment_type_name, patient_id, patient_name, practitioner_user_id, practitioner_name, organization_participant_id, encounter_id, encounter_status, payment_type, insurance_name, insurance_id, missing_progress_note, missing_services, cpt_codes, units_total }], pagination: { current_page, per_page, total_count, total_pages } } }
  - Note: Practitioner-only endpoint, gated by LaunchDarkly flag `appointment_status_report`. Requires active EHR_FULL/VMG_FULL org membership plus OrganizationPolicy.view_appointment_reports? permission (`view_appointment_reports` on Organization). start_date/end_date are required; per_page defaults to 20 and maxes at 100. Invalid timezone is silently dropped (report falls back to default timezone) rather than returning 400. Invalid filter values return 400.

---

## Availabilities

- `GET /api/v1/availabilities` — List provider availabilities (one-time and repeating occurrences) in a date window for calendar scheduling.
  - Params: `start_date*, end_date* (ISO date), organization_id, org_participant_id, appointment_type_id, contact_type ("In Person"|"Phone Call"|"Secure Videochat")`
  - Response: { availabilities: [{ id, repeating_availability_id, is_repeating, day_of_week, start_utc, end_utc, end_on, appointment_type_id, appointment_type_name, appointment_type_length, contact_type, contact_type_label, org_participant_id, organization_id, provider_first_name, provider_last_name, provider_avatar_url }], errors: [] }
  - Note: Practitioner-only endpoint. start_date/end_date are required; invalid/missing values return 400. Scope is permission-aware (provider self scope or admin/provider scope via CalendarProviderScopes). appointment_type_id filtering requires organization_id. Invalid contact_type returns 400. Repeating rules may trigger just-in-time occurrence generation up to the requested end window.
- `POST /api/v1/availabilities` — Create a provider availability rule (one-time or repeating) for a specific appointment type and optional contact type.
  - Params: `organization_id*, org_participant_id*, variant* ("one_time"|"repeating"), timezone*, appointment_type_id*, contact_type ("In Person"|"Phone Call"|"Secure Videochat"), start_time* (one_time), end_time* (one_time), date* (repeating), start_time_only* (repeating), end_time_only* (repeating), end_on (repeating)`
  - Response: { availability: { id }, errors: [] }
  - Note: Practitioner-only endpoint. Organization must be EHR_FULL/VMG_FULL with active membership. Authorization uses AvailabilityPolicy.create? (`create_availability` permission on Organization for self-managed provider, or org owner/admin override). appointment_type_id must resolve to an active org/global appointment type. Marketplace initial-consult appointment type forces contact_type to Secure Videochat. Creates an AvailabilityRule and triggers occurrence generation.
- `PUT|PATCH /api/v1/availabilities/:id` — Update an existing availability rule (schedule, appointment type, and contact type) for a provider.
  - Params: `organization_id*, org_participant_id, variant* ("one_time"|"repeating"), timezone*, appointment_type_id*, contact_type ("In Person"|"Phone Call"|"Secure Videochat"), start_time* (one_time), end_time* (one_time), date* (repeating), start_time_only* (repeating), end_time_only* (repeating), end_on (repeating)`
  - Response: { availability: { id }, errors: [] }
  - Note: Practitioner-only endpoint. Organization must be EHR_FULL/VMG_FULL with active membership. Rule id must exist and belong to organization_id; when org_participant_id is provided it must match the rule owner. Requires AvailabilityPolicy.update? (`update_availability` org permission for own provider, or org owner/admin override). appointment_type_id must resolve for the organization; marketplace initial-consult type forces contact_type to Secure Videochat. Update rewrites rule metadata and triggers occurrence regeneration from an effective start time.
- `DELETE /api/v1/availabilities/:id` — Delete an availability rule so its future availability is removed.
  - Params: `organization_id*, org_participant_id`
  - Response: { availability: { deleted: true }, errors: [] }
  - Note: Practitioner-only endpoint. Organization must be EHR_FULL/VMG_FULL with active membership. availability id must exist and belong to organization_id; if org_participant_id is provided it must match the rule's provider. Authorization uses AvailabilityPolicy.destroy? (`delete_availability` permission on Organization for self-managed provider, or org owner/admin override). Deleting the rule cascades to related occurrences/joins.

---

## Calendar Blocks

- `POST /api/v1/calendar_blocks` — Create a calendar blocker interval for a provider to mark unavailable time in scheduling views.
  - Params: `organization_id*, org_participant_id*, start_time*, end_time*, timezone*, notes`
  - Response: { block: { id }, errors: [] }
  - Note: Practitioner-only endpoint. Organization must be EHR_FULL/VMG_FULL with active membership. Requires CalendarBlockPolicy.create? (self-provider with `create_appointment` org permission, or org owner/admin acting on others). start_time/end_time are converted from provided timezone to UTC before persistence.
- `DELETE /api/v1/calendar_blocks/:id` — Delete an existing provider calendar blocker.
  - Params: `organization_id*, org_participant_id`
  - Response: { block: { deleted: true }, errors: [] }
  - Note: Practitioner-only endpoint. Organization must be EHR_FULL/VMG_FULL with active membership. Block must belong to organization_id; optional org_participant_id can enforce provider match. Requires CalendarBlockPolicy.destroy? (same permission model as create). Missing block id returns 404.

---

## Appointment Types

- `GET /api/v1/appointment_types` — List active appointment types available to an organization, including org-owned and global types.
  - Params: `organization_id*`
  - Response: { appointment_types: [{ id, name, length, org_participant_id }], errors: [] }
  - Note: Requires OrganizationPolicy.view_appointment_types? permission (`view_appointment_types` on Organization) and EHR_FULL/VMG_FULL active membership. Results are sorted by name ascending.
- `POST /api/v1/appointment_types` — Create an organization-scoped appointment type used for scheduling provider sessions (for example "Initial Eval - 60 min"). Use this when configuring an org's appointment catalog.
  - Params: `organization_id*, name*, length*`
  - Response: { appointment_type: { id }, errors: [] }
  - Note: Requires practitioner context plus OrganizationPolicy.create_appointment_type? permission (`create_appointment_type` on Organization). Organization must be EHR_FULL/VMG_FULL and user must be an active org member. Name+length must be unique within the organization; duplicate combinations return 422.
- `PUT|PATCH /api/v1/appointment_types/:id` — Update an organization's appointment type name and/or duration.
  - Params: `organization_id*, name, length`
  - Response: { appointment_type: { id }, errors: [] }
  - Note: Requires practitioner context plus OrganizationPolicy.update_appointment_type? permission (`update_appointment_type` on Organization), and EHR_FULL/VMG_FULL active membership. Global marketplace initial-consult type is immutable. name+length must remain unique within the organization (excluding the current record); duplicates return 422.
- `DELETE /api/v1/appointment_types/:id` — Remove an organization appointment type from active use.
  - Params: `organization_id*`
  - Response: { appointment_type: { deleted: true }, errors: [] }
  - Note: Requires practitioner context plus OrganizationPolicy.destroy_appointment_type? permission (`destroy_appointment_type` on Organization), and EHR_FULL/VMG_FULL active membership. The global marketplace initial-consult appointment type cannot be deleted. If delete is blocked by existing references, backend falls back to soft-deactivation (status set inactive) and still returns deleted=true.
- `GET /api/v1/appointment_types/list_for_dropdown` — Return compact appointment-type options for UI dropdowns when selecting visit type during booking.
  - Params: `organization_id*`
  - Response: { appointment_types: [{ id, name, length, forced_contact_type }], errors: [] }
  - Note: Requires OrganizationPolicy.view? (`read` Organization permission) and EHR_FULL/VMG_FULL active membership. Includes both active org and global types, sorted by name. forced_contact_type is only set for the global marketplace initial-consult type and is `Secure Videochat`.

---

## Patient Encounters (EHR)

- `GET /api/v1/appointments/:id/encounter` — Fetch encounter, notes, and services associated with an appointment.
  - Params: `none`
  - Response: { encounter, notes, services, errors }
  - Note: Requires PatientPolicy.show? on appointment patient and EHR/VMG full active org membership. If encounter doesn't exist for appointment, returns null encounter with empty arrays.
- `POST /api/v1/patient_encounters/:id/attach_files` — Attach uploaded files to a patient encounter record.
  - Params: `files* (multipart file array)`
  - Response: { encounter_id, attachments: [{ id, filename, content_type, byte_size, url }] }
  - Note: Requires PatientEncounterPolicy.attach_files?. Validates allowed file types/sizes on encounter model.
- `GET /api/v1/patient_encounters/:id/billing` — Return billing context for a specific encounter, including invoices and primary payment method.
  - Params: `none`
  - Response: { primary_payment_method, invoices, workspace: { auto_pay_billing }, organization: { appointment_patient_cancel_fee, invoice_cadence }, billing_exempt }
  - Note: Requires PatientEncounterPolicy.charge_customers? and EHR/VMG full active org membership.
- `GET /api/v1/patient_encounters/:id/billing_detail` — Return detailed billing view for one encounter, including invoices and insurance-claim submissions.
  - Params: `none`
  - Response: { encounter: { ...billing encounter... }, invoices, workspace: { auto_pay_billing }, organization: { appointment_patient_cancel_fee }, insurance_claims }
  - Note: Requires OrganizationPolicy.billing_dashboard? plus EHR/VMG full active org membership. Billing-exempt encounters return not found. Includes internal_note only when current user has PatientEncounterPolicy.update_internal_notes?.
- `POST /api/v1/patient_encounters/:id/complete` — Mark encounter completed after documentation/billing prerequisites are satisfied.
  - Params: `none`
  - Response: { id, status, payment_type, payment_status, organization_id, organization_participant_id, attachments, copay_invoiced, service_fee_invoiced, candid_claim_link, billing_artifacts_locked, payment_type_lock_reason, patient_has_payment_methods, patient_has_active_diagnosis }
  - Note: Requires PatientEncounterPolicy.complete? and EHR/VMG full active org membership. Validates encounter.completion_status before completion. Enqueues CandidEncounterCreateJob for eligible insurance encounters (skips billing-exempt).
- `DELETE /api/v1/patient_encounters/:id/detach_file/:attachment_id` — Remove one attached file from a patient encounter.
  - Params: `none`
  - Response: { encounter_id, attachments: [{ id, filename, content_type, byte_size, url }] }
  - Note: Requires PatientEncounterPolicy.detach_files?. attachment_id is provided in route segment.
- `PATCH /api/v1/patient_encounters/:id/internal_notes` — Create/update/clear internal billing note for an encounter.
  - Params: `internal_note* (string; blank clears note)`
  - Response: { encounter: { ...billing encounter incl internal_note... }, errors: [] }
  - Note: Requires PatientEncounterPolicy.update_internal_notes?, EHR/VMG full active org membership, and internal_note param presence.
- `POST /api/v1/patient_encounters/:id/invoices/per_session` — Build cash-pay per-session invoice for encounter services (or no-show/late-cancel fee invoice) and optionally auto-charge.
  - Params: `none`
  - Response: { invoice: { ...billing invoice... }, charged }
  - Note: Requires PatientEncounterPolicy.charge_customers?, EHR/VMG full active org membership, and billable appointment status. For service invoices, encounter must be cash-pay and meet completion requirement when org policy requires completed sessions before billing.
- `POST /api/v1/patient_encounters/:id/invoices/per_session_insurance_copay` — Create or update a per-session copay invoice line for an insurance encounter and optionally auto-charge.
  - Params: `copay_cents* (positive integer), description`
  - Response: { invoice: { ...billing invoice... }, charged }
  - Note: Requires PatientEncounterPolicy.charge_customers?. Encounter must be insurance, not billing-exempt, and not in no-session appointment statuses; organization must have insurance claims enabled.
- `POST /api/v1/patient_encounters/:id/invoices/service_fee` — Add a custom service-fee line item invoice for an insurance encounter.
  - Params: `amount_cents* (positive integer), description`
  - Response: { invoice: { ...billing invoice... }, charged }
  - Note: Requires PatientEncounterPolicy.charge_customers?. Encounter must be insurance, insurance claims must be enabled, and appointment cannot be cancelled/no-show.
- `POST /api/v1/patient_encounters/:id/prefill_documentation_from_previous` — Prefill encounter documentation from the most recent completed prior encounter for same org/patient/provider.
  - Params: `simulate (boolean)`
  - Response: { preview, created: { services }, note_prefill, errors }
  - Note: Practitioner-only with EHR/VMG full active org membership and PatientEncounterPolicy.complete?. Requires current encounter to have no notes and no services. With simulate=true returns preview only; otherwise clones prior services and returns note prefill payload.
- `GET /api/v1/patient_encounters/:id/previous_encounter_care_services` — Fetch care-service lines from the most recent completed prior encounter for same org/patient/provider.
  - Params: `none`
  - Response: { care_services: [{ cpt_code_id, cpt_code_modifier, fee, units, name, description, cash_fee }], errors }
  - Note: Requires PatientPolicy.show? on current encounter patient plus EHR/VMG full active org membership.
- `POST /api/v1/patient_encounters/:id/reopen` — Reopen a completed encounter back to in-progress state with audit reason.
  - Params: `reason*`
  - Response: { id, status, payment_type, payment_status, organization_id, organization_participant_id, attachments, copay_invoiced, service_fee_invoiced, candid_claim_link, billing_artifacts_locked, payment_type_lock_reason, patient_has_payment_methods, patient_has_active_diagnosis }
  - Note: Requires PatientEncounterPolicy.reopen? and EHR/VMG full active org membership. Creates PatientEncounterStatusEvent audit record for status transition.
- `PATCH /api/v1/patient_encounters/:id/update_payment_type` — Change encounter payment type between cash and insurance.
  - Params: `payment_type* (cash|insurance)`
  - Response: { encounter: { id, payment_type }, errors: [] }
  - Note: Requires PatientEncounterPolicy.update_payment_type? (includes complete? permission and lock checks). Switching to insurance additionally requires insurance_claims_enabled on organization.
- `GET /api/v1/patient_encounters/billing_dashboard` — Return paginated encounter billing dashboard data with summary and time-series aggregates.
  - Params: `organization_id*, patient_id, appointment_id, limit, page, searchText, dateRange/customDateStart/customDateEnd/start_date/end_date, paymentType, status, provider, invoiceStatus, encounterComplete, paymentStatus, claimStatus, sort, sort_direction, timeseries_period`
  - Response: { encounters: [{ ...billing encounter... }], pagy: { page, items, pages, count, prev, next }, billing_timeseries, summary, session_completion_settings, errors }
  - Note: Requires OrganizationPolicy.billing_dashboard? plus EHR/VMG full active org membership. Supports Ruby-side filtering/sorting for paymentStatus/claimStatus and metric sorts.

---

## Insurance Claims

- `POST /api/v1/patient_encounters/:patient_encounter_id/insurance_claims/:id/poll` — Request a manual poll of claim status for an encounter insurance submission.
  - Params: `none`
  - Response: { message, encounter_id, submission_id }
  - Note: Requires PatientEncounterPolicy.complete? authorization plus EHR/VMG full org access and insurance_claims_enabled. Blocks billing-exempt encounters. Validates submission pollability through Claims::SubmissionsService and enqueues Candid::PollEncounterClaimJob (manual=true).
- `POST /api/v1/patient_encounters/:patient_encounter_id/insurance_claims/:id/retry` — Retry a failed insurance claim submission for an encounter.
  - Params: `none`
  - Response: { message, encounter_id }
  - Note: Requires PatientEncounterPolicy.complete? authorization plus EHR/VMG full org access and insurance_claims_enabled. Blocks billing-exempt encounters. Only retryable failed submissions are allowed (Claims::SubmissionsService.retryable_status); endpoint deletes old submission and enqueues CandidEncounterCreateJob.

---

## Care Services

- `POST /api/v1/care_services` — Add a billed service line item to an appointment encounter (CPT-based or custom service) for clinical/billing workflows.
  - Params: `organization_id*, org_participant_id*, patient_id*, appointment_id*, cpt_code_id, cpt_code_modifier, units, name, description, cash_fee`
  - Response: { care_service: { id, fee, units, created_at, updated_at, patient_encounter_id, organization_participant_id, practitioner_name, name, description, cash_fee, on_invoice, on_paid_invoice, cpt_code_modifier, cpt_code: { id, code, description } }, errors: [] }
  - Note: Requires EHR_FULL/VMG_FULL active org membership and PatientPolicy.update_related_data? on patient. patient/appointment/organization alignment is strictly validated. Services cannot be added for appointment no-show/cancel statuses or completed encounters. For CPT services, duplicate CPT per encounter+provider is blocked; fee is sourced from OrganizationCareService when configured. For non-CPT custom services, fee falls back to cash_fee (or 0).
- `PUT|PATCH /api/v1/care_services/:id` — Update mutable fields on a care service line item (units/description/name/cash fee/modifier) prior to final billing.
  - Params: `units, name, description, cash_fee, cpt_code_modifier`
  - Response: { care_service: { id, fee, units, created_at, updated_at, patient_encounter_id, organization_participant_id, practitioner_name, name, description, cash_fee, on_invoice, on_paid_invoice, cpt_code_modifier, cpt_code: { id, code, description } }, errors: [] }
  - Note: Requires EHR_FULL/VMG_FULL active org membership, PatientPolicy.update_related_data? on the encounter patient, and CareServicePolicy.update? (creator or org owner/admin in organization). Cannot update services in completed encounters or services on paid/partially-paid invoices.
- `DELETE /api/v1/care_services/:id` — Remove a care service line item from an encounter before billing is finalized.
  - Params: `none`
  - Response: { care_service: { deleted: true }, errors: [] }
  - Note: Requires EHR_FULL/VMG_FULL active org membership, PatientPolicy.update_related_data? on the encounter patient, and CareServicePolicy.delete? (creator or org owner/admin within organization). Cannot delete services from completed encounters or services already attached to an invoice.

---

## Organizations

- `GET /api/v1/organizations` — List organizations visible to the current practitioner.
  - Params: `none`
  - Response: Array of { id, name, avatar_url, plan, synced_to_ehr }
  - Note: Uses OrganizationPolicy::Scope and includes active_plan-derived fields.
- `POST /api/v1/organizations` — Create a new organization and associate current user as owner/member.
  - Params: `name*, variant, address1, address2, city, state, phone_number, postal_code, email, org_npi, num_users, practice_role, website, avatar, accepted_insurances[]`
  - Response: { id, name, variant, address1, address2, city, state, postal_code, email, phone_number, website, org_npi, num_users, stripe_connected_account_id, stripe_connected_account_status, created_at, updated_at, owner_id, active_members_count, pending_invitations_count, is_owner, avatar_url, billing_configured, accepted_insurances, insurance_claims_enabled, plan, content_sharing_rules, owner, organization_participants }
  - Note: Uses Exchange::Interactors::Organizations::CreateOrganizationOrganizer workflow; returns 422 with interactor error message on failure.
- `GET /api/v1/organizations/:id` — Fetch full organization profile including participants, plan, billing, and content-sharing defaults.
  - Params: `none`
  - Response: { id, name, variant, address1, address2, city, state, postal_code, email, phone_number, website, org_npi, num_users, stripe_connected_account_id, stripe_connected_account_status, created_at, updated_at, owner_id, active_members_count, pending_invitations_count, is_owner, avatar_url, billing_configured, accepted_insurances, insurance_claims_enabled, plan, content_sharing_rules, owner, organization_participants }
  - Note: Requires OrganizationPolicy.view?.
- `PUT|PATCH /api/v1/organizations/:id` — Update organization profile attributes.
  - Params: `name, variant, address1, address2, city, state, phone_number, postal_code, email, org_npi, num_users, practice_role, website, avatar, accepted_insurances[]`
  - Response: { id, name, variant, address1, address2, city, state, postal_code, email, phone_number, website, org_npi, num_users, stripe_connected_account_id, stripe_connected_account_status, created_at, updated_at, owner_id, active_members_count, pending_invitations_count, is_owner, avatar_url, billing_configured, accepted_insurances, insurance_claims_enabled, plan, content_sharing_rules, owner, organization_participants }
  - Note: Requires OrganizationPolicy.update?. Validation failures return 422.
- `DELETE /api/v1/organizations/:id` — Placeholder destroy route; no destroy action is currently implemented in Api::V1::OrganizationsController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: routes expose organizations destroy, but controller currently implements create/read/update/member/billing actions only.
- `POST /api/v1/organizations/:id/billing_portal` — Create a Stripe Billing Portal session URL for organization billing management.
  - Params: `return_url*`
  - Response: { url }
  - Note: Requires OrganizationPolicy.configure_billing?. Ensures Stripe customer exists before creating Stripe::BillingPortal::Session.
- `POST /api/v1/organizations/:id/billing_portal_subscription_update` — Create a Stripe Billing Portal URL that opens directly in subscription-update flow.
  - Params: `return_url*`
  - Response: { url }
  - Note: Requires OrganizationPolicy.configure_billing? and an active subscription with stripe_subscription_id; otherwise returns bad request.
- `POST /api/v1/organizations/:id/checkout_session` — Create Stripe Checkout session URL for starting/changing organization subscription purchase.
  - Params: `price_id* (or subscription[price_id]), success_url*, cancel_url*`
  - Response: { url }
  - Note: Requires OrganizationPolicy.configure_billing?. Creates Stripe subscription-mode checkout session with promotion codes enabled and organization metadata.
- `POST /api/v1/organizations/:id/invite_members` — Invite one or more practitioner/admin members to an organization by email.
  - Params: `emails*[] (non-empty), first_name, last_name, role (Admin|Practitioner)`
  - Response: { success, errors }
  - Note: Requires OrganizationPolicy.invite_members?. Delegates to OrganizationInvitationService.invite_practitioners, which creates/reactivates participants, assigns org roles, and sends invitation/notification emails.
- `GET /api/v1/organizations/:id/members` — List active organization members with optional search and pagination.
  - Params: `search, page, per_page`
  - Response: Either Array of { ...organization participant... } or { members: [{ ...organization participant... }], pagy: { page, items, pages, count, prev, next } }
  - Note: Requires OrganizationPolicy.view_members?. Uses OrganizationService.members_with_patients. Returns paginated wrapper only when pagination params are provided; otherwise returns raw array for legacy clients.
- `GET /api/v1/organizations/:id/members/:member_id` — Fetch one active organization participant/member.
  - Params: `none`
  - Response: { id, active, practice_role, valid_until, created_at, organization_id, role, license_type, assigned_patient_ids, accepted_insurances, accepting_patients, practitioner, organization }
  - Note: Requires OrganizationPolicy.view_members?.
- `PUT /api/v1/organizations/:id/members/:member_id` — Change an organization member's role between Admin and Practitioner.
  - Params: `role* (Admin|Practitioner)`
  - Response: { role }
  - Note: Requires OrganizationPolicy.update_members?. Cannot change org owner role or current user's own role. Applies role via OrganizationRoleService.set_internal_role!.
- `DELETE /api/v1/organizations/:id/members/:member_id` — Remove (deactivate) an organization member.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires OrganizationPolicy.remove_members?. Cannot remove org owner or current user. Uses OrganizationService.deactivate_participant which also removes org roles and cleans election links.
- `POST /api/v1/organizations/:id/members/:member_id/resend_invitation` — Resend organization invitation email for a member who has not accepted yet.
  - Params: `none`
  - Response: { success, message }
  - Note: Requires OrganizationPolicy.invite_members?. Works only when invitation_sent_at is present and invitation_accepted_at is nil.
- `GET /api/v1/organizations/:id/members/dropdown` — Return organization practitioners formatted for dropdown selection.
  - Params: `ehr_full_only, patient_id`
  - Response: Array of { id, name, practitioner_id, first_name, last_name, avatar_url }
  - Note: Requires OrganizationPolicy.view?. If caller also has view_members permission, returns all active participants; otherwise scoped to current user participant. Optional patient_id restricts to practitioners with access_to_patient?.
- `GET /api/v1/organizations/:id/members_for_dropdown` — Return organization practitioners formatted for dropdown selection.
  - Params: `ehr_full_only, patient_id`
  - Response: Array of { id, name, practitioner_id, first_name, last_name, avatar_url }
  - Note: Requires OrganizationPolicy.view?. If caller also has view_members permission, returns all active participants; otherwise scoped to current user participant. Optional patient_id restricts to practitioners with access_to_patient?.
- `GET /api/v1/organizations/:id/pending_invitations` — List organization member invitations that were sent but not yet accepted.
  - Params: `none`
  - Response: { pending_invitations: [{ id, email, invited_at, user_id, practitioner_id }] }
  - Note: Requires OrganizationPolicy.invite_members?. Data comes from OrganizationInvitationService.list_pending_invitations.
- `GET /api/v1/organizations/:id/subscriptions` — List active subscriptions for an organization.
  - Params: `none`
  - Response: Array of { id, status, start_date, end_date, plan }
  - Note: Requires OrganizationPolicy.view_subscription?. Returns active subscriptions ordered by start_date descending.
- `PUT /api/v1/organizations/:id/update_insurances` — Replace organization accepted insurance list.
  - Params: `accepted_insurances[]`
  - Response: { id, name, variant, address1, address2, city, state, postal_code, email, phone_number, website, org_npi, num_users, stripe_connected_account_id, stripe_connected_account_status, created_at, updated_at, owner_id, active_members_count, pending_invitations_count, is_owner, avatar_url, billing_configured, accepted_insurances, insurance_claims_enabled, plan, content_sharing_rules, owner, organization_participants }
  - Note: Requires OrganizationPolicy.update?. Missing list defaults to empty array.

---

## Organization Billing

- `PATCH /api/v1/organizations/:id/billing/cancel_fee` — Update organization cancellation fee charged to patients.
  - Params: `appointment_patient_cancel_fee*`
  - Response: { appointment_patient_cancel_fee }
  - Note: Requires OrganizationPolicy.configure_billing?. Fee must be numeric and non-negative.
- `POST /api/v1/organizations/:id/billing/onboarding/account_link` — Create Stripe Connect onboarding account-link URL for organization billing setup.
  - Params: `none`
  - Response: { url }
  - Note: Requires OrganizationPolicy.configure_billing? plus EHR/VMG full active org membership. Organization must already have stripe_connected_account_id.
- `GET /api/v1/organizations/:id/billing/onboarding/refresh` — Regenerate Stripe onboarding link and redirect browser to it.
  - Params: `none`
  - Response: HTTP redirect to Stripe onboarding URL.
  - Note: Requires OrganizationPolicy.configure_billing?. Organization must have stripe_connected_account_id.
- `GET /api/v1/organizations/:id/billing/status` — Fetch current Stripe connected-account onboarding status and blockers.
  - Params: `none`
  - Response: { status, blockers, charges_enabled, payouts_enabled, account_id, capabilities, appointment_patient_cancel_fee }
  - Note: Requires OrganizationPolicy.configure_billing?. If connected account exists, endpoint refreshes status from Stripe and updates cached organization status fields.

---

## Organization Invoice Settings

- `GET /api/v1/organizations/:id/billing/invoice_settings` — Fetch organization invoice cadence and billing-policy settings.
  - Params: `none`
  - Response: { invoice_cadence, invoice_day_of_week, invoice_day_of_month, payment_terms_days, require_auto_pay_billing, require_cash_pay_session_completion_for_billing_start, require_notes_for_cash_pay_session_completion }
  - Note: Requires OrganizationPolicy.configure_billing?.
- `PATCH /api/v1/organizations/:id/billing/invoice_settings` — Update organization invoice cadence and billing-policy settings.
  - Params: `invoice_settings[invoice_cadence], invoice_settings[invoice_day_of_week], invoice_settings[invoice_day_of_month], invoice_settings[require_auto_pay_billing], invoice_settings[require_cash_pay_session_completion_for_billing_start], invoice_settings[require_notes_for_cash_pay_session_completion]`
  - Response: { invoice_cadence, invoice_day_of_week, invoice_day_of_month, payment_terms_days, require_auto_pay_billing, require_cash_pay_session_completion_for_billing_start, require_notes_for_cash_pay_session_completion }
  - Note: Requires OrganizationPolicy.configure_billing?. When require_auto_pay_billing changes false->true, enqueues EnableOrgAutoPayBillingJob.

---

## Organization Intake Flows

- `GET /api/v1/organizations/:organization_id/intake_flows` — List intake flows configured for an organization.
  - Params: `none`
  - Response: Array of { id, name, description, is_default, position, steps, documents }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Includes ordered step and document metadata per flow.
- `POST /api/v1/organizations/:organization_id/intake_flows` — Create an intake flow definition with ordered steps and linked required documents.
  - Params: `name*, description, is_default, position, steps[] (patient_info|health_history|payment_methods|insurance|documents), document_ids[]`
  - Response: { id, name, description, is_default, position, steps, documents }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. steps/document_ids replace flow step/document associations; model enforces one default flow per organization.
- `GET /api/v1/organizations/:organization_id/intake_flows/:id` — Fetch one intake flow with ordered steps and attached documents.
  - Params: `none`
  - Response: { id, name, description, is_default, position, steps, documents }
  - Note: Requires OrganizationPolicy.manage_intake_settings?.
- `PUT|PATCH /api/v1/organizations/:organization_id/intake_flows/:id` — Update intake flow metadata, step ordering, and required documents.
  - Params: `name, description, is_default, position, steps[], document_ids[]`
  - Response: { id, name, description, is_default, position, steps, documents }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. steps/document_ids replace existing associations.
- `DELETE /api/v1/organizations/:organization_id/intake_flows/:id` — Delete an intake flow configuration.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Deletion is blocked when flow is assigned to patients.

---

## Organization Intake Documents

- `GET /api/v1/organizations/:organization_id/intake_documents` — List intake documents available to the organization (global + org-specific).
  - Params: `none`
  - Response: Array of { id, title, agreement_type, version, global, available_for_intake, created_at, updated_at }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Ordered by organization, agreement_type, and version descending.
- `POST /api/v1/organizations/:organization_id/intake_documents` — Create organization-scoped intake document (user agreement) available for intake flows.
  - Params: `title, content*, version*, agreement_type*`
  - Response: { id, title, agreement_type, version, global, available_for_intake, created_at, updated_at, content }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Created records are tied to organization and forced available_for_intake=true.
- `GET /api/v1/organizations/:organization_id/intake_documents/:id` — Fetch one intake document with full content.
  - Params: `none`
  - Response: { id, title, agreement_type, version, global, available_for_intake, created_at, updated_at, content }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Supports global or org-scoped documents available to organization intake.
- `PUT|PATCH /api/v1/organizations/:organization_id/intake_documents/:id` — Update an organization-specific intake document.
  - Params: `title, content, version, agreement_type`
  - Response: { id, title, agreement_type, version, global, available_for_intake, created_at, updated_at, content }
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Global documents are read-only from this endpoint.
- `DELETE /api/v1/organizations/:organization_id/intake_documents/:id` — Delete an organization-specific intake document.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires OrganizationPolicy.manage_intake_settings?. Global documents cannot be deleted. Documents referenced by intake flows cannot be deleted (422).

---

## Organization Care Services (CPT Codes)

- `GET /api/v1/organizations/:organization_id/cpt_codes` — List configured care services (CPT catalog) for an organization.
  - Params: `none`
  - Response: Array of { id, deletable, unit_duration_minutes, bill_in_units, name, description, cash_fee, fee, cpt_code_modifier, cpt_code }
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.view_list?. Response precomputes deletable flags and only includes fee for org owner/admin users.
- `POST /api/v1/organizations/:organization_id/cpt_codes` — Create one organization care service (CPT-backed or custom service).
  - Params: `cpt_code_id, name, description, cash_fee, fee, bill_in_units, unit_duration_minutes, cpt_code_modifier`
  - Response: { id, deletable, unit_duration_minutes, bill_in_units, name, description, cash_fee, fee, cpt_code_modifier, cpt_code }
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.create?. fee/cash_fee blanks are coerced to 0. Unit fields are validated against CPT-code presence.
- `PUT|PATCH /api/v1/organizations/:organization_id/cpt_codes/:id` — Update editable fields on an organization care service.
  - Params: `cpt_code_id, name, description, cash_fee, fee, bill_in_units, unit_duration_minutes, cpt_code_modifier`
  - Response: { id, deletable, unit_duration_minutes, bill_in_units, name, description, cash_fee, fee, cpt_code_modifier, cpt_code }
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.update?. Blank fee/cash_fee are normalized to 0 before update.
- `DELETE /api/v1/organizations/:organization_id/cpt_codes/:id` — Delete an organization care service.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.destroy?. Returns 422 when record cannot be destroyed (for example due to dependent usage).
- `POST /api/v1/organizations/:organization_id/cpt_codes/bulk_create` — Bulk-create organization care services (CPT-backed or custom) in one request.
  - Params: `items*[] with item[cpt_code_id], item[name], item[description], item[cash_fee], item[fee], item[bill_in_units], item[unit_duration_minutes], item[cpt_code_modifier]`
  - Response: { created: [{ id, deletable, unit_duration_minutes, bill_in_units, name, description, cash_fee, fee, cpt_code_modifier, cpt_code }] }
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.create?. Skips duplicates by existing cpt_code_id within organization, pre-validates each row via model validations, inserts via insert_all, and returns created CPT-backed records.
- `GET /api/v1/organizations/:organization_id/cpt_codes/search` — Search CPT code catalog for addable organization care services.
  - Params: `query, page (default 1), per_page (default 25, max 100)`
  - Response: { items: [{ id, code, description }], page, per_page, total_count }
  - Note: Requires EHR/VMG full active org membership and OrganizationCareServicePolicy.search?. Excludes CPT codes already selected for the organization.

---

## Organization Patients

- `POST /api/v1/organizations/:id/assign_patient` — Assign one or more patients to practitioners within an organization.
  - Params: `_json* array of { practitioner_id*, patient_id* }`
  - Response: { success, assigned_count }
  - Note: Practitioner-only endpoint requiring active membership in org plus OrganizationPolicy.assign_patient?. Runs assignments in a transaction via OrganizationPatientsService.assign_patient! and returns conflict/not-found errors for membership/state issues.
- `GET /api/v1/organizations/:id/my_patients` — List patients assigned to the current practitioner in an organization.
  - Params: `none`
  - Response: Array of { ...patient fields... }
  - Note: Practitioner-only endpoint with active org membership required. Authorizes OrganizationPolicy.view? and returns PractitionerPatientsService.list_for(current_user, organization).
- `GET /api/v1/organizations/:id/my_patients_for_ehr_org_dropdown` — Return organization patient dropdown options for EHR flows (optionally with billing hints).
  - Params: `org_participant_id, for_appointments ("true" to include billing flags)`
  - Response: Array of { id, name, avatar_url, first_name, last_name, ...optional billing fields... }
  - Note: Practitioner-only endpoint with active org membership required and OrganizationPolicy.view?. org owners/admins may request another participant via org_participant_id; non-admins are scoped to themselves.
- `DELETE /api/v1/organizations/:id/unassign_patient` — Remove practitioner-to-patient assignments in bulk within an organization.
  - Params: `_json* array of { practitioner_id*, patient_id* }`
  - Response: { success, unassigned_count }
  - Note: Practitioner-only endpoint requiring active membership in org plus OrganizationPolicy.assign_patient?. Runs unassignments in transaction via OrganizationPatientsService.unassign_patient!.

---

## Organization Content Sharing

- `PATCH /api/v1/organizations/:id/content_sharing_rules` — Upsert default organization content-sharing behavior for allowed subject classes.
  - Params: `rules*[] with rule[subject_class]* and rule[default_share_to_workspace]*`
  - Response: { organization_id, rules: [{ subject_class, default_share_to_workspace }] }
  - Note: Requires OrganizationPolicy.manage_content_sharing_rules?. subject_class must be in OrganizationContentSharingRule::ALLOWED_SUBJECT_CLASSES (PatientFile, Goal). Endpoint uses transaction to upsert each rule.

---

## Organization Participants

- `GET /api/v1/organization_participants/:id` — Fetch one organization participant record with practitioner/insurance settings.
  - Params: `none`
  - Response: { id, active, practice_role, valid_until, created_at, organization_id, role, license_type, assigned_patient_ids, accepted_insurances, accepting_patients, practitioner, organization }
  - Note: Requires OrganizationParticipantPolicy.show? (participant themself or org owner/admin).
- `PUT|PATCH /api/v1/organization_participants/:id` — Update organization participant patient-intake toggles and accepted insurances.
  - Params: `accepting_patients, accepted_insurances[]`
  - Response: { id, active, practice_role, valid_until, created_at, organization_id, role, license_type, assigned_patient_ids, accepted_insurances, accepting_patients, practitioner, organization }
  - Note: Requires OrganizationParticipantPolicy.update? (participant themself or org owner/admin). accepted_insurances values are validated against accepted insurance enum and organization subset.

---

## Data Imports

- `GET /api/v1/organizations/:organization_id/data_imports` — List recent data-import sessions for an organization.
  - Params: `none`
  - Response: Array of { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Uses DataImportPolicy::Scope (org owners/admins only) and returns at most 5 most recent imports for the organization.
- `POST /api/v1/organizations/:organization_id/data_imports` — Create a new organization data-import session.
  - Params: `adapter_key`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.create?). adapter_key defaults to simple_practice and only simple_practice is accepted.
- `GET /api/v1/organizations/:organization_id/data_imports/:id` — Fetch one data-import session with current status/progress/details.
  - Params: `none`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.show?). Import is scoped to the organization in the nested route.
- `POST /api/v1/organizations/:organization_id/data_imports/:id/confirm_upload` — Attach an uploaded ZIP blob to a data import and start background analysis.
  - Params: `blob_id*, password`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.confirm_upload?). Validates blob exists in storage and is non-empty, attaches export_file, optionally encrypts ZIP password, updates import to status=analyze/current_phase=uploaded, and enqueues DataImportJobs::ExtractAndAnalyzeJob.
- `POST /api/v1/organizations/:organization_id/data_imports/:id/notify_on_completion` — Opt the import into completion/failure notification emails.
  - Params: `none`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.notify_on_completion?). Sets analysis_result.notify_on_completion=true, which downstream import jobs use to trigger DataImportMailer notifications.
- `POST /api/v1/organizations/:organization_id/data_imports/:id/prepare_upload` — Generate a direct-upload URL for the ZIP file associated with a data import.
  - Params: `filename, content_type, checksum, size`
  - Response: { signed_url, blob_id, key, headers: { "Content-Type" } }
  - Note: Organization owner/admin only (DataImportPolicy.prepare_upload?). Defaults filename to simplepractice_export.zip and content_type to application/zip. Upload key prefix is data_imports/:id and checksum is auto-generated if omitted.
- `POST /api/v1/organizations/:organization_id/data_imports/:id/retry_analysis` — Re-run ZIP extraction and analysis for a failed import.
  - Params: `password`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.retry_analysis?). Allowed only when status=failed. Optionally updates encrypted ZIP password, resets status to analyze, and executes DataImportJobs::ExtractAndAnalyzeJob synchronously (perform_now).
- `POST /api/v1/organizations/:organization_id/data_imports/:id/start_import` — Start record creation from a reviewed analysis result.
  - Params: `exclude_patient_keys[] (normalized keys), caregiver_field_overrides[] (patient_key, candidate_index, target_field, source_path|manual_value|clear_value), caregiver_omissions[] (patient_key, candidate_index)`
  - Response: { id, organization_id, status, adapter_key, analysis_result, progress_percent, current_phase, last_error, confirmed_at, notify_on_completion, patient_count, created_at, updated_at }
  - Note: Organization owner/admin only (DataImportPolicy.start_import?). Import must be in review status. Validates excluded keys and caregiver override/omission payloads, updates import to status=import/current_phase=starting_import, and enqueues DataImportJobs::CreateRecordsJob.

---

## Patient Analytics

- `GET /api/v1/organizations/:organization_id/patients/analytics_report` — Build patient analytics report for an organization over a date range.
  - Params: `start_date* (date), end_date* (date), org_participant_id, stage`
  - Response: { report: { filters, summary, age_distribution, diagnosis_distribution, stage_distribution } }
  - Note: Practitioner-only. Requires LaunchDarkly APPOINTMENT_STATUS_REPORT flag, EHR/VMG full active org membership, and OrganizationPolicy.view_patient_reports?. Returns validation and authorization errors with report=nil.

---

## Workspaces

- `GET /api/v1/workspaces` — List workspaces available to the current user.
  - Params: `none`
  - Response: Array of { id, name, patient_count, member_count, primary_patient, patient, workspace_has_billing_configured_orgs, auto_pay_billing, enable_ai_summaries, billing_organizations }
  - Note: Uses WorkspacePolicy scope and serializes with WorkspaceSerializer.
- `GET /api/v1/workspaces/:id` — Fetch one workspace by ID with membership, patient, and billing summary fields.
  - Params: `none`
  - Response: { id, name, patient_count, member_count, primary_patient, patient, workspace_has_billing_configured_orgs, auto_pay_billing, enable_ai_summaries, billing_organizations }
  - Note: Requires WorkspacePolicy.show?.
- `PATCH /api/v1/workspaces/:id/auto_pay_billing` — Update workspace-level auto-pay billing preference used for caregiver-managed payment behavior.
  - Params: `auto_pay_billing* (boolean)`
  - Response: { id, name, patient_count, member_count, primary_patient, patient, workspace_has_billing_configured_orgs, auto_pay_billing, enable_ai_summaries, billing_organizations }
  - Note: Requires WorkspacePolicy.update_billing_settings? (caregiver payment-method update permission or admin). Missing auto_pay_billing param returns HTTP 400.
- `PATCH /api/v1/workspaces/:id/settings` — Update workspace settings currently exposed for AI summaries toggle.
  - Params: `enable_ai_summaries* (boolean)`
  - Response: { id, name, patient_count, member_count, primary_patient, patient, workspace_has_billing_configured_orgs, auto_pay_billing, enable_ai_summaries, billing_organizations }
  - Note: Requires WorkspacePolicy.update_workspace_settings?. Missing enable_ai_summaries param returns HTTP 400.
- `GET /api/v1/workspaces/by_patient/:patient_id` — Resolve and return the workspace associated with a patient.
  - Params: `none`
  - Response: { id, name, patient_count, member_count, primary_patient, patient, workspace_has_billing_configured_orgs, auto_pay_billing, enable_ai_summaries, billing_organizations }
  - Note: Returns not_found when patient has no workspace. Requires workspace presence in scoped_workspace_ids and WorkspacePolicy.show? authorization.

---

## Workspace Patient Summaries

- `GET /api/v1/workspaces/:workspace_id/patient_summary` — Legacy summary endpoint that returns the latest AI patient summary for a workspace or 404 for unavailable states.
  - Params: `timeframe* (weekly|monthly), date (YYYY-MM-DD)`
  - Response: { id, timeframe, text, focus_areas, generated_for_date, range_start_date, range_end_date, file_previews }
  - Note: Requires workspace access via scoped_workspace_ids plus WorkspacePolicy.show?. Returns HTTP 404 when AI summaries are disabled or no matching summary exists.
- `GET /api/v1/workspaces/:workspace_id/patient_summary_v2` — State-aware summary endpoint for portal and newer clients.
  - Params: `timeframe* (weekly|monthly), date (YYYY-MM-DD)`
  - Response: If disabled: { enabled: false }. If enabled with no summary: { enabled: true, has_summary: false }. Otherwise WorkspacePatientSummarySerializer payload.
  - Note: Uses same workspace access checks as show but returns state objects instead of legacy 404 behavior.

---

## Workspace Intake

- `POST /api/v1/workspaces/:id/intake/send_reminders` — Send intake reminder emails to selected workspace managers.
  - Params: `user_ids* (array of manager user ids)`
  - Response: { success, sent_count, message }
  - Note: Requires WorkspacePolicy.manage_intake?. user_ids must be non-empty array. Uses IntakeReminderService to validate manager membership and enqueue IntakeReminderJob emails; failures return an errors array with HTTP 422.
- `GET /api/v1/workspaces/:id/intake/status` — Return intake completion status for each intake step in a workspace.
  - Params: `none`
  - Response: { should_show_intake, intake_flow_id, intake_flow_name, flow_steps, patient_info: { status, info_text }, health_history: { status, info_text }, payment_methods: { status, info_text }, insurance: { status, info_text }, documents: { status, info_text, required_documents } }
  - Note: Workspace id comes from route segment. Access is allowed when (workspace is VMG and WorkspacePolicy.show?) OR WorkspacePolicy.manage_intake?. Data is produced by IntakeService.intake_status_for_workspace_id.
- `PATCH /api/v1/workspaces/:id/intake/toggle_should_show_intake` — Toggle whether intake should be shown to workspace managers.
  - Params: `none`
  - Response: { should_show_intake, message }
  - Note: Requires WorkspacePolicy.manage_intake?. Flips workspace.should_show_intake boolean in place.
- `GET /api/v1/workspaces/:id/intake/workspace_managers` — List workspace managers and reminder metadata for intake follow-up.
  - Params: `none`
  - Response: { workspace_managers: [{ id, first_name, last_name, email, avatar_url, last_reminder_sent_at }], incomplete_steps }
  - Note: Requires WorkspacePolicy.manage_intake?. incomplete_steps are human-readable labels for pending steps computed from IntakeService.

---

## Memberships

- `POST /api/v1/memberships/:id/accept_invitation_agreement` — Accept workspace invitation agreement for the current user's membership.
  - Params: `none`
  - Response: { success, message }
  - Note: Membership is scoped to current_user.workspace_memberships. Requires invitation_agreement_required? on membership; acceptance records a workspace_invitation_agreement acceptance and sets invitation_agreement_accepted_at.
- `GET /api/v1/memberships/pending` — List current user's memberships waiting on their consent.
  - Params: `none`
  - Response: Array of { workspace_id, invited_by, patient }
  - Note: Filters current_user.workspace_memberships where consent_status is pending.
- `GET /api/v1/memberships/pending_consent` — List pending-consent memberships that the current user can approve.
  - Params: `none`
  - Response: Array of { id, workspace, patient, user, role, relationship, consent_status, invited_by }
  - Note: Computes workspace ids where user has approve WorkspaceMembership permission, then returns pending memberships in those workspaces.
- `GET /api/v1/memberships/pending_invitation_agreement` — List memberships where invitation agreement acceptance is still required.
  - Params: `none`
  - Response: Array of { id, workspace_id, patient, invited_by, invitation_agreement }
  - Note: Uses current_user.workspace_memberships.requiring_invitation_agreement. Includes latest workspace_invitation_agreement payload when configured.
- `GET /api/v1/workspaces/:workspace_id/memberships` — List workspace membership records for a workspace.
  - Params: `none`
  - Response: Array of { id, role, relationship, created_at, consent_status, consent_at, consent_expires_at, organization, user, workspace, consented_by }
  - Note: Requires workspace to be in scoped_workspace_ids for current user.
- `PUT|PATCH /api/v1/workspaces/:workspace_id/memberships/:id` — Update workspace membership relationship label.
  - Params: `relationship`
  - Response: { id, role, relationship, created_at, consent_status, consent_at, consent_expires_at, organization, user, workspace, consented_by }
  - Note: Requires scoped workspace access and WorkspaceMembershipPolicy.update?. Tracks Mixpanel \"Workspace Team Member Relationship Updated\".
- `DELETE /api/v1/workspaces/:workspace_id/memberships/:id` — Remove a member from a workspace.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires scoped workspace access and WorkspaceMembershipPolicy.remove?. Tracks Mixpanel \"Workspace Team Member Removed\" on success.
- `GET /api/v1/workspaces/:workspace_id/memberships/:id/consent_agreement` — Return rendered guardian workspace consent agreement for a workspace membership.
  - Params: `none`
  - Response: { agreement: { id, version, title, content, created_at, agreement_type } }
  - Note: Requires workspace membership visibility via scoped workspace access. Agreement content is rendered with member name and default expiration date of 12 months from now.
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/grant_consent` — Grant consent for a pending workspace membership and trigger delayed invitation if needed.
  - Params: `consent_expires_at`
  - Response: { id, role, relationship, created_at, consent_status, consent_at, consent_expires_at, organization, user, workspace, consented_by }
  - Note: Requires WorkspaceMembershipPolicy.approve?, scoped workspace access, and current user admin or caregiver. Calls membership.grant_consent!, records guardian_workspace_consent agreement acceptance snapshot, tracks Mixpanel event, and may send delayed invitation.
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/resend_invitation` — Resend Devise invitation email for a workspace membership user who has not yet accepted.
  - Params: `none`
  - Response: { success, message }
  - Note: Requires scoped workspace access. Only works when user has invitation_sent_at and no invitation_accepted_at; selects caregiver/practitioner invitation template before deliver_invitation.
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/revoke_consent` — Revoke previously granted consent for a workspace membership.
  - Params: `none`
  - Response: { id, role, relationship, created_at, consent_status, consent_at, consent_expires_at, organization, user, workspace, consented_by }
  - Note: Requires WorkspaceMembershipPolicy.approve?, scoped workspace access, and current user admin or caregiver. Calls membership.revoke_consent! (which destroys membership) and tracks Mixpanel \"Workspace Consent Revoked\".
- `POST /api/v1/workspaces/:workspace_id/memberships/:id/set_elected_organization` — Set or switch the elected organization context for a practitioner's workspace membership.
  - Params: `organization_participant_id*`
  - Response: { success, organization: { id, name, avatar_url }, patient, existing_patient }
  - Note: Requires scoped workspace access; membership user must equal current user; membership role must be practitioner. Delegates to WorkspaceMembershipService.set_elected_organization!, which may create/reuse organization patient in workspace and adjust election records.

---

## Workspace Roles

- `GET /api/v1/workspace_roles/list_all_permissions` — List all workspace-scoped permissions that can be assigned to roles.
  - Params: `none`
  - Response: { permissions: Array<{ id, action, subject_class, scope, group, description }> }
  - Note: Current implementation does not enforce manager/admin checks in this action. Returns permissions where access_scope is workspace.
- `GET /api/v1/workspaces/:workspace_id/roles` — List roles configured for a workspace.
  - Params: `none`
  - Response: Array of { id, name, custom, title, description, permissions }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator.
- `POST /api/v1/workspaces/:workspace_id/roles` — Create a custom workspace role with an initial permission set.
  - Params: `name*, title, description, permissions* (Array of { action, subject_class, scope })`
  - Response: { id, name, custom, title, description, permissions }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Body is parsed as raw JSON; permissions are mandatory and unresolved permission tuples are ignored during assignment.
- `PUT|PATCH /api/v1/workspaces/:workspace_id/roles/:id` — Update a custom workspace role and optionally replace its permission set.
  - Params: `name, title, description, permissions (Array of { action, subject_class, scope })`
  - Response: { id, name, custom, title, description, permissions }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Only custom roles are updatable; role lookup is restricted to custom true.
- `DELETE /api/v1/workspaces/:workspace_id/roles/:id` — Delete a workspace role.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Deletes the role by id within the workspace scope.
- `POST /api/v1/workspaces/:workspace_id/roles/:id/add_permissions` — Add workspace-scoped permissions to an existing workspace role.
  - Params: `permissions* (Array of { id })`
  - Response: { id, name, custom, title, description, permissions }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Request body is parsed as raw JSON; invalid or empty permissions array returns HTTP 400.
- `POST /api/v1/workspaces/:workspace_id/roles/:id/assign_role` — Assign a workspace role to a user, replacing the user's existing roles for that workspace.
  - Params: `user_id*`
  - Response: { message }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Uses WorkspaceMembershipService.assign_role! and returns not_found when role or user is missing.
- `POST /api/v1/workspaces/:workspace_id/roles/:id/remove_permissions` — Remove specific permissions from a workspace role.
  - Params: `permissions* (Array of { id })`
  - Response: { id, name, custom, title, description, permissions }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Request body is parsed as raw JSON; invalid or empty permissions array returns HTTP 400.
- `POST /api/v1/workspaces/:workspace_id/roles/:id/remove_role` — Remove a workspace role from a user.
  - Params: `user_id*`
  - Response: { message }
  - Note: Requires workspace manager, WorkspacePermission manage permission, or system administrator. Uses WorkspaceMembershipService.remove_role! and returns not_found when role or user is missing.
- `GET /api/v1/workspaces/:workspace_id/roles/list_user_permissions` — List workspace roles assigned to a user, defaulting to the current user.
  - Params: `user_id`
  - Response: { user_id, roles: Array<{ id, name, custom, title, description, permissions }> }
  - Note: If user_id targets another user, caller must be workspace manager or system administrator; otherwise returns HTTP 403.

---

## Match Requests

- `POST /api/v1/match_requests` — Placeholder route from resources; no create action is currently implemented in Api::V1::MatchRequestsController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: routes.rb defines a match_requests resource with create/show, but this controller handles booking creation through create_marketplace_booking instead.
- `GET /api/v1/match_requests/:id` — Fetch one match request with related patient/provider/caregiver data and appointment summary.
  - Params: `none`
  - Response: { match_request: { ... }, appointment }
  - Note: Requires MatchRequestPolicy.view? and EHR/VMG full org gating. Response is built by MatchRequestsSerializer.serialize_for_show.
- `PATCH /api/v1/match_requests/:id/accept` — Accept a review-stage match request and optionally create/update appointment scheduling.
  - Params: `accepted_start_time, note, propose_new_time`
  - Response: { match_request: { ... }, appointment: { id } | nil }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. Only review-status requests can be accepted. Delegates workflow to MatchRequestAcceptanceService and sends appointment-confirmed email.
- `PATCH /api/v1/match_requests/:id/cancel` — Cancel a match request from caregiver/practitioner workflow.
  - Params: `closed_reason_code, note`
  - Response: { match_request: { id } }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. Sets status to canceled, conditionally sets closed_at when closed_reason_code is provided, and sends cancellation email flow.
- `PATCH /api/v1/match_requests/:id/confirm` — Advance an accepted match request through enrollment/confirmation workflow.
  - Params: `note`
  - Response: { match_request: { ... }, organization_patient_id }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. Supports ACCEPTED->ENROLLED (creates/assigns organization patient via MatchRequestConfirmationService) and ENROLLED->CONFIRMED transitions; requires accepted_start_time to be present.
- `PATCH /api/v1/match_requests/:id/decline` — Decline a match request with reason/note.
  - Params: `closed_reason_code, note`
  - Response: { match_request: { id } }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. Sets status to declined with closed_at and sends rejection email flow.
- `GET /api/v1/match_requests/:id/history` — Return paginated change history for a match request (status, scheduling, note, updater fields).
  - Params: `per_page`
  - Response: { history_entries: [{ changed_at, changed_by, changes: [{ field, label, old_value, new_value, field_type }] }], pagy: { page, items, pages, count, prev, next }, error }
  - Note: Requires MatchRequestPolicy.view? and EHR/VMG full org gating. Data comes from PaperTrail versions filtered to MatchRequests::HistorySerializer::FIELDS.
- `PATCH /api/v1/match_requests/:id/propose_alternative` — Propose an alternative meet-and-greet time on an existing match request.
  - Params: `proposed_start_time*, timezone*, note`
  - Response: { match_request: { id } }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. proposed_start_time is converted to UTC via DatetimeUtils.convert_to_utc, updates accepted_start_time/last_proposed_at, and triggers proposal email notification.
- `PATCH /api/v1/match_requests/:id/reject` — Reject a match request and unwind related scheduling/assignment state.
  - Params: `closed_reason_code, note`
  - Response: { match_request: { id } }
  - Note: Requires MatchRequestPolicy.update? and EHR/VMG full org gating. In transaction, marks request rejected, cancels linked appointment when present, attempts practitioner unassignment from organization_patient, sets organization_patient stage to never_started, then sends rejection email.
- `PATCH /api/v1/match_requests/:id/reschedule_meet_greet` — Reschedule accepted/review meet-and-greet time and keep appointment in sync if one exists.
  - Params: `proposed_start_time*, timezone*, note`
  - Response: { match_request: { ... } }
  - Note: Requires MatchRequestPolicy.reschedule? and EHR/VMG full org gating. Updates accepted_start_time/last_proposed_at and, when appointment exists, recalculates appointment start/end using duration fallback logic. Sends rescheduled email flow.
- `GET /api/v1/match_requests/caregiver_index` — List match requests visible to caregiver (or care navigator), with filtering, counts, sorting, and pagination.
  - Params: `contact_type (comma-separated), status, patient_id, organization_id (comma-separated), search, date_range (past|today|tomorrow|this_week|next_week|this_month|more_than_month), status_category (archived|ready_for_action|awaiting_response), sort (status|date_created|date_updated), page, per_page`
  - Response: { match_requests: [{ ... }], pagy: { page, items, pages, count, prev, next }, error, counts: { all, ready_for_action, awaiting_response, archived } }
  - Note: Uses MatchRequestPolicy::CaregiverScope (care navigators can see requests for patients in navigator workspaces). Applies validated filters and status-bucket counts before pagination.
- `POST /api/v1/match_requests/create_marketplace_booking` — Create a marketplace match request from caregiver booking flow and persist booking/payment selections.
  - Params: `organization_patient_id*, organization_id*, caregiver_patient_id*, organization_participant_id*, timezone*, accepted_start_time (or times_requested[0] legacy), notes, summarized_initial_request_notes, contact_type, cash_pay, phone_number, location, timeslot_preference, caregiver_payment_method_id, payment_method_id, billing_name, billing_email, care_settings[], ai_matchmaking_query_slug, appointment_type[name]*, appointment_type[duration_minutes]*`
  - Response: { match_request_id }
  - Note: Requires MatchRequestPolicy.create? (caregiver only). Validates caregiver access to caregiver_patient and org-patient ownership by organization. Delegates to Marketplace::BookingPayments::FinalizeService, sends caregiver+practitioner emails, and optionally links Compass query/interaction when ai_matchmaking_query_slug is provided.
- `GET /api/v1/match_requests/practitioner_index` — List match requests visible to practitioner/admin with filtering, counts, sorting, and pagination.
  - Params: `organization_participant_id, contact_type (comma-separated), status, patient_id, organization_id (comma-separated), search, date_range (past|today|tomorrow|this_week|next_week|this_month|more_than_month), payment_method (has_insurance|has_payment_method, comma-separated), status_category (archived|ready_for_action|awaiting_response), sort (status|date_created|date_updated), page, per_page`
  - Response: { match_requests: [{ ... }], pagy: { page, items, pages, count, prev, next }, error, counts: { all, ready_for_action, awaiting_response, archived } }
  - Note: Uses MatchRequestPolicy::PractitionerScope (org admin/owner can expand scope, regular practitioners see own requests). Applies validated filters and computes status-category counts before pagination.
- `POST /api/v1/match_requests/preview_booking_summary` — Generate AI summary preview of booking notes before final submission.
  - Params: `notes`
  - Response: { summary }
  - Note: Requires MatchRequestPolicy.create? (caregiver). Blank notes return summary=nil. Uses AiBookingNotes::SummarizeService and does not persist the summary.

---

## AI Matchmaking

- `POST /api/v1/ai_matchmaking` — Run an AI-powered practitioner matchmaking search from free-text caregiver/practitioner input and return ranked recommendations with eligibility context. Use this to power Compass-style "find the best-fit provider" flows.
  - Params: `user_input_text*, speed ("think_fast"|"think_deeply", default "think_fast")`
  - Response: { slug, user_input_text, ai_message, child_name, recommendations: [{ id, rank, practitioner_name, reason, score, organization_participant_id, checklist: { insurance, availability, service_area, license_type } }], eligibility_criteria: { license_type_ids, licensed_states, care_settings_any, specialization_ids_any, language_ids_any, age_range_ids_any, zip_code, city, state, accepted_insurance_keys_any, require_active_membership }, eligible_organization_participants_count, eligible_organization_participant_ids }
  - Note: Gated by LaunchDarkly flag `marketplace`. Creates an AiMatchmakingQuery for the current user, calls Gemini-backed criteria extraction + recommendation generation, persists AiMatchmakingResult analytics, and caches the response by slug for 1 hour. Returns 422 when user_input_text is blank or AI generation/parsing fails.
- `GET /api/v1/ai_matchmaking/:slug` — Fetch a previously generated matchmaking result by slug, with fallback regeneration when a persisted result is missing. Used when reopening a shared/bookmarked result page.
  - Params: `none`
  - Response: { slug, user_input_text, ai_message, child_name, recommendations: [{ id, rank, practitioner_name, reason, score, organization_participant_id, checklist: { insurance, availability, service_area, license_type } }], eligibility_criteria: { ... }, eligible_organization_participants_count, eligible_organization_participant_ids }
  - Note: Gated by LaunchDarkly flag `marketplace`. Looks up AiMatchmakingQuery by slug; if query.result exists it is returned directly, otherwise the controller uses cache-backed regeneration and persists a new AiMatchmakingResult for that query. Endpoint is slug-addressable and does not enforce query ownership. Missing slug returns 404.
- `GET /api/v1/ai_matchmaking/search_history` — Return the current user's recent AI matchmaking searches. Used to populate "recent searches" history in matchmaking UI.
  - Params: `none`
  - Response: { queries: [{ id, slug, user_input_text, created_at }] }
  - Note: Gated by LaunchDarkly flag `marketplace`. Returns at most 20 queries ordered newest-first and scoped to records where created_by_user is the current user.
- `POST /api/v1/ai_matchmaking/track_interaction` — Record user interactions with matchmaking results (for example profile views or booking starts) for analytics and conversion tracking.
  - Params: `slug*, interaction_type* ("profile_view"|"booking_started"), organization_participant_id`
  - Response: { success: true, interaction_id }
  - Note: Gated by LaunchDarkly flag `marketplace`. Creates an AiMatchmakingInteraction linked to the query slug; when organization_participant_id is provided and recommendation data exists, recommendation_rank and recommendation_score are auto-filled from the stored result. Invalid interaction_type returns 422; unknown slug returns 404.

---

## Marketplace Practitioners

- `GET /api/v1/marketplace/practitioners` — Search/list marketplace providers with organization pairing and dynamic filter metadata.
  - Params: `service_area, accepted_insurances[] (display names), availability[date], availability[start_at], availability[end_at], availability[selected_days][], availability[contact_type], has_photo`
  - Response: { practitioners: [{ id, first_name, last_name, avatar_url, avatar_map_marker_url, title, bio, city, state, zip_code, specializations, organization, care_settings, license_type, languages, age_ranges, accepted_insurances, service_area_center, service_area_coordinates }], total_count, filters }
  - Note: Requires marketplace feature flag. Uses cached marketplace cohort ids (service-area and insurance filtered), optional availability and photo filters, and returns up to 150 org participants. Care navigators can see approved + pending providers; other users see approved only.
- `GET /api/v1/marketplace/practitioners/availability_counts` — Return usually-available provider counts by day/hour for current marketplace cohort and filters.
  - Params: `contact_type`
  - Response: { availability_counts, filters_applied: { contact_type, cohort_size, concept, week_span, minimum_weeks } }
  - Note: Requires LaunchDarkly marketplace flag. Counts are derived from marketplace-filtered provider cohort via MarketplaceAvailabilities::AvailabilityAggregator.usually_available_distribution.
- `GET /api/v1/marketplace/providers/:id` — Return detailed marketplace profile for a provider at a specific organization.
  - Params: `none`
  - Response: { practitioner: { id, first_name, last_name, avatar_url, avatar_map_marker_url, title, bio, city, state, zip_code, specializations, organization, care_settings, license_type, service_area_coordinates, service_area_center, email, languages, age_ranges, accepted_insurances } }
  - Note: Route id is organization_participant id (not practitioner id). Requires marketplace feature flag and marketplace scope visibility.
- `GET /api/v1/marketplace/providers/:id/available_slots` — Return bookable time slots for a marketplace provider between two dates.
  - Params: `start_date* (ISO8601 date), end_date* (ISO8601 date), appointment_type_id, timezone`
  - Response: { slots: [{ date, length }], errors: [], next_available }
  - Note: Provider id is organization_participant id in route. Requires marketplace flag and marketplace-eligible participant. If appointment_type_id is omitted, service falls back from initial-consult slots to other appointment types. Returns 400 for missing/invalid dates.
- `GET /api/v1/marketplace/providers/:id/usually_available` — Return \"usually available\" weekly windows for a marketplace provider profile.
  - Params: `weeks (1..12, default 6), contact_type`
  - Response: { availability_summary: { weeks_observed, windows_by_contact_type }, errors: [] }
  - Note: Route id is organization_participant id. Requires marketplace feature flag. Windows are computed from recurring availability patterns (minimum 3 observed weeks, 30-minute block threshold) and grouped by contact type + weekday.

---

## Marketplace Service Areas

- `GET /api/v1/marketplace/service_areas` — Return city/state suggestions for marketplace service-area search input.
  - Params: `query`
  - Response: { suggestions: [{ id, text, city, state, description }] }
  - Note: Requires marketplace feature flag. Uses Google Places Autocomplete (US cities). Blank query returns empty suggestions array.

---

## Marketplace Bookings

- `POST /api/v1/marketplace/bookings/prepare` — Prepare marketplace booking payment context and ensure an organization patient exists.
  - Params: `caregiver_patient_id*, organization_id*, organization_participant_id*, organization_patient_id`
  - Response: { organization_patient_id, has_ach_capability, has_caregiver_payment_methods, has_org_patient_payment_methods, collect_payment_methods }
  - Note: caregiver_patient must be user-owned (created_by_user_id present). Loads participant from organization and uses Marketplace::BookingPayments::PrepareService to find/create org patient, link caregiver, and evaluate payment-method readiness. Returns service errors with propagated HTTP status.
- `GET /api/v1/marketplace/bookings/status` — Return booking-payment readiness flags for a caregiver patient and organization pairing.
  - Params: `caregiver_patient_id*, organization_id*`
  - Response: { organization_patient_id, organization_has_stripe_account, organization_ach_capable, collect_payment_methods }
  - Note: caregiver_patient must be user-owned (created_by_user_id present). If an organization patient link already exists for this caregiver/org pair, organization_patient_id is returned; otherwise it is null.

---

## Chat Channels

- `GET /api/v1/chat_channels` — List chat channels for the current user, optionally scoped to a specific workspace.
  - Params: `workspace_id`
  - Response: Array of { id, guid, name, description, type, workspace_id, conversation_id, member_count, avatar, status, cometchat_synced, created_at, updated_at, created_by_id, searchable_names }
  - Note: When workspace_id is provided, endpoint requires an active workspace membership with granted consent; otherwise returns 403. Without workspace_id, returns channels across all consented workspaces. Results exclude deleted/archived channels and are ordered by latest message timestamp fallback updated_at.
- `POST /api/v1/chat_channels` — Create a new chat channel (group or direct) with local channel + membership records and CometChat synchronization.
  - Params: `channel[workspace_id]*, channel[member_ids]* (array user ids), channel[type] ("direct"|"group", default "group"), channel[name] (required for non-direct), channel[avatar_blob_id]`
  - Response: { id, guid, name, description, type, workspace_id, conversation_id, member_count, avatar, status, cometchat_synced, created_at, updated_at, created_by_id, searchable_names }
  - Note: Requires ChatChannelPolicy.create? (`create` on DirectMessage/GroupMessage in workspace). Channel is created locally first; if CometChat creation fails, channel remains pending and CreateCometChatChannelJob is queued for retry. avatar_blob_id is validated for content type/size but is not currently passed into create_channel.
- `GET /api/v1/chat_channels/:id` — Fetch one chat channel by local id or CometChat group guid.
  - Params: `none`
  - Response: { id, guid, name, description, type, workspace_id, conversation_id, member_count, avatar, status, cometchat_synced, created_at, updated_at, created_by_id, searchable_names }
  - Note: Requires ChatChannelPolicy.show? (current user must be an active channel member). Returns 404 if channel cannot be resolved from id/guid.
- `PUT|PATCH /api/v1/chat_channels/:id` — Update channel metadata (name and/or avatar) for an existing chat channel.
  - Params: `name, avatar_blob_id`
  - Response: { id, guid, name, description, type, workspace_id, conversation_id, member_count, avatar, status, cometchat_synced, created_at, updated_at, created_by_id, searchable_names }
  - Note: Channel :id accepts local numeric id or CometChat guid. Requires ChatChannelPolicy.update? (`create` permission on DirectMessage/GroupMessage in workspace). At least one of name or avatar_blob_id is required. avatar_blob_id must be an image blob (png/jpeg/gif) <=5MB. If CometChat sync fails, local update still persists.
- `DELETE /api/v1/chat_channels/:id` — Archive a chat channel from active use.
  - Params: `none`
  - Response: { success: true, channel: { id, workspace_id, created_by_id, name, description, channel_type, cometchat_group_uid, conversation_id, member_count, avatar_url, metadata, status, cometchat_created_at, last_sync_at, default_channel, created_at, updated_at }, message }
  - Note: channel :id accepts local numeric id or CometChat guid. Requires ChatChannelPolicy.destroy? (`delete` on DirectMessage/GroupMessage or `delete` on AnyChat in workspace). Local status is set to archived; if CometChat sync is available, metadata is updated with village-archived flags.
- `POST /api/v1/chat_channels/:id/add_members` — Add members to an existing chat channel and create/activate local channel memberships.
  - Params: `workspace_id*, member_uids* (array of CometChat UIDs)`
  - Response: { success: true, memberships: [{ id, status, created_at, updated_at, cometchat_synced, user: { ... }, chat_channel: { ... } }] }
  - Note: channel :id can be either local numeric chat_channel id or CometChat group guid. Requires ChatChannelPolicy.add_members? (`add` ChatMembership permission scoped to workspace). Unknown member_uids that do not map to users are ignored. If CometChat sync fails, local memberships still persist and SyncChatChannelMembersJob is queued.
- `GET /api/v1/chat_channels/:id/members` — Return workspace membership records for active members of a chat channel.
  - Params: `none`
  - Response: Array of { id, role, relationship, created_at, consent_status, consent_at, consent_expires_at, organization, user: { id, first_name, last_name, name, initials, email, avatar_url, practitioner? }, workspace, consented_by }
  - Note: Channel :id accepts either local chat_channel id or CometChat guid. Requires ChatChannelPolicy.show? (current user must be an active member of the channel). Response is serialized as WorkspaceMembershipSerializer (not chat-channel memberships).
- `POST /api/v1/chat_channels/:id/remove_members` — Remove members from a chat channel by CometChat UID and mark their local memberships as removed.
  - Params: `workspace_id*, member_uids* (array of CometChat UIDs)`
  - Response: { success: true, memberships: [{ id, status, created_at, updated_at, cometchat_synced, user: { ... }, chat_channel: { ... } }] }
  - Note: Channel :id accepts local numeric id or CometChat guid. Requires ChatChannelPolicy.remove_members? (`remove` ChatMembership permission in workspace). If CometChat removal fails, local state still updates and a sync job is queued.
- `GET /api/v1/chat_channels/direct_dm_counterparts` — List users the current user already has direct-message channels with in a workspace, so clients can avoid creating duplicate DMs.
  - Params: `workspace_id*`
  - Response: Array of CometChat user UIDs (strings)
  - Note: Requires current user to be a workspace member. Uses CometChat group metadata and group-member lookups for channels tagged as direct DMs in the specified workspace. Returns 403 when user is not in the workspace.

---

## Chat Attachments

- `POST /api/v1/chat_attachments` — Finalize a previously uploaded blob as a pending chat attachment and return a village attachment URL token that can be referenced in chat messages.
  - Params: `blob_id*`
  - Response: { id, attachment_url }
  - Note: blob_id must reference an existing ActiveStorage::Blob. The attachment is created with pending=true and original_url set to `village-attachment-<id>`. file_type is inferred from content type/filename via FileTypeDeterminable.
- `GET /api/v1/chat_attachments/:id` — Retrieve metadata and signed file URLs for a chat attachment.
  - Params: `workspace_id*, channel_type* ("direct"|"group"), channel_id*, member_uids* (comma-separated CometChat UIDs)`
  - Response: { id, name, url, view_url, content_type, size, file_type, pending, created_at, thumbnail_url, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires workspace-level send ChatMessage permission and channel membership assertion via member_uids (current user's cometchat_uid must be included). Missing required query params returns 400. Invalid channel_type returns 400. Attachment id missing returns 404.
- `PUT /api/v1/chat_attachments/signed_url` — Generate a direct-upload signed URL and blob placeholder for chat attachment file upload.
  - Params: `workspace_id*, filename*, content_type*, size*, checksum`
  - Response: { signed_url, blob_id, key, headers: { "Content-Type" } }
  - Note: Requires WorkspacePolicy.upload_chat_attachment? (`send` permission on ChatMessage for the workspace). Upload key is namespaced under `chat_attachments/`. Missing workspace_id or unknown workspace returns 404.

---

## Chat Messages

- `GET /api/v1/chat_messages/last_sent_by_user_across_workspaces` — Return the most recent message sent by the current user across all workspaces where they currently have granted consent.
  - Params: `none`
  - Response: { message: { id, content, message_type, channel_type, sender_uid, receiver_uid, receiver_type, sent_at, cometchat_message_id, metadata, workspace_id, sender_id, channel_display_name, participant_names } | nil }
  - Note: Scope is restricted to consented workspaces (consent_status=granted and unexpired) and channels where user has active chat-channel membership; archived/deleted channels are excluded.
- `GET /api/v1/chat_messages/last_sent_by_user_in_workspace` — Return the most recent message sent by the current user in one workspace.
  - Params: `workspace_id*`
  - Response: { workspace_id, message: { id, content, message_type, channel_type, sender_uid, receiver_uid, receiver_type, sent_at, cometchat_message_id, metadata, workspace_id, sender_id, channel_display_name, participant_names } | nil }
  - Note: Requires workspace membership existence (not consent check) and filters to channels where user has active chat membership; archived/deleted channels are excluded. Missing workspace_id returns 400; unauthorized workspace returns 403.
- `GET /api/v1/chat_messages/latest_across_workspaces` — Return latest chat messages across all consented workspaces for inbox-style previews.
  - Params: `size (integer 1..10, default 3)`
  - Response: { messages: [{ id, content, message_type, channel_type, sender_uid, receiver_uid, receiver_type, sent_at, cometchat_message_id, metadata, workspace_id, sender_id, channel_display_name, participant_names }] }
  - Note: Uses workspaces where current user has granted, unexpired consent; filters to channels where user has active membership and excludes archived/deleted channels. size above 10 is capped to 10; explicit values outside 1..10 return 400.
- `GET /api/v1/chat_messages/latest_in_workspace` — Return the newest chat messages for a single workspace, for recent-message preview cards.
  - Params: `workspace_id*, size (integer 1..10, default 3)`
  - Response: { workspace_id, messages: [{ id, content, message_type, channel_type, sender_uid, receiver_uid, receiver_type, sent_at, cometchat_message_id, metadata, workspace_id, sender_id, channel_display_name, participant_names }] }
  - Note: Requires the current user to be a workspace member and limits messages to channels where the user has an active chat membership; archived/deleted channels are excluded. Missing workspace_id returns 400, unauthorized workspace returns 403.
- `GET /api/v1/chat_messages/unread_counts_by_channel` — Return unread message totals grouped by channel for the current user.
  - Params: `none`
  - Response: { total_unread_count, channels: [{ cometchat_group_uid, unread_count, id, name, channel_type, workspace_id, workspace_name, status }] }
  - Note: Requires current_user.cometchat_uid; otherwise returns 400. Uses CometChat unread counts, then filters to local channels in consented workspaces and excludes archived channels from totals.

---

## Chat Exports

- `POST /api/v1/chat_exports` — Export channel message history as CSV or PDF (optionally bounded by date range).
  - Params: `channel_id* (CometChat group guid), format* ("csv"|"pdf"), start_date (ISO8601), end_date (ISO8601)`
  - Response: Success: file download stream (`text/csv` or `application/pdf`, attachment disposition). Failure: { errors: [...] }
  - Note: Requires ChatChannelPolicy.export? (current user must be an active channel member). channel_id is resolved via chat_channels.cometchat_group_uid. start_date must be <= end_date when both provided. Export reads locally persisted ChatMessage + ChatAttachment data.

---

## Clinical Note Forms

- `POST /api/v1/clinical_note_forms` — Create a new clinical note form submission for a patient encounter.
  - Params: `organization_id*, custom_module_form_id*, patient_id*, org_participant_id*, appointment_id*, name, form_answers[]* (custom_module_id, answer, mod_type)`
  - Response: { form: { id }, errors: [] }
  - Note: Practitioner-only. Requires EHR/VMG full access + active org membership and PatientPolicy.update_related_data?. Validates patient/organization/appointment alignment, blocks writes to completed encounters, and persists diagnosis answers via DiagnosisService when provided. Evaluation templates require at least one diagnosis answer.
- `PUT|PATCH /api/v1/clinical_note_forms/:id` — Update an existing clinical note form submission.
  - Params: `name, form_answers[]* (custom_module_id, answer, mod_type)`
  - Response: { form: { id }, errors: [] }
  - Note: Practitioner-only. Requires PatientPolicy.update_related_data?, ClinicalNotePolicy.update?, and EHR/VMG full + active org membership. Cannot update notes tied to completed encounters. For evaluation forms, at least one diagnosis answer is required.
- `DELETE /api/v1/clinical_note_forms/:id` — Delete a clinical note form record.
  - Params: `none`
  - Response: { form: { deleted: true }, errors: [] }
  - Note: Practitioner-only. Requires PatientPolicy.update_related_data? on the note's patient, ClinicalNotePolicy.delete?, and EHR/VMG full + active org membership. Deletion is blocked when the linked encounter is completed.
- `POST /api/v1/clinical_note_forms/:id/generate_pdf` — Generate (or regenerate) a PDF file for a clinical note and return its download URL.
  - Params: `none`
  - Response: { pdf_url, filename }
  - Note: Practitioner-only. Requires PatientPolicy.show? for the note's patient and EHR/VMG full + active org membership on the note organization. Uses ClinicalNotePdfService.generate_and_attach. Returns 404 if clinical note id is missing.
- `GET /api/v1/clinical_note_forms/list_for_patient` — List clinical note forms for a patient, with optional provider/status/date filters.
  - Params: `organization_id*, patient_id*, org_participant_id, status ("in_progress"|"completed"), submitted_after (YYYY-MM-DD)`
  - Response: { forms: [{ form_answer_group: { custom_module_form: { id }, created_at, updated_at, name, patient_id, clinical_note_id, creator_organization_participant_id, organization_id, encounter_status, filler: { id, name, avatar_url }, form_answers: [...] }, appointment: { id, start } | nil }], errors: [] }
  - Note: Practitioner-only. Requires EHR/VMG full + active org membership, patient ownership by organization, and PatientPolicy.show?. Filters are validated (provider must belong to patient's org, status limited to in_progress/completed, submitted_after must parse as date) and invalid filters return 400.
- `GET /api/v1/clinical_note_forms/org_members_for_dropdown` — Return organization providers who have authored clinical notes for the specified patient.
  - Params: `organization_id*, patient_id*`
  - Response: Array of { id, name, practitioner_id, first_name, last_name, avatar_url }
  - Note: Requires PatientPolicy.show?. Returns 403 when patient is not owned by the organization or organization lacks EHR/VMG full access. Response only includes organization participants referenced by patient's existing clinical_notes.

---

## Clinical Form Templates

- `GET /api/v1/clinical_form_templates` — List available charting form templates for an organization.
  - Params: `organization_id*`
  - Response: { forms: [{ id, name }], errors: [] }
  - Note: Requires OrganizationPolicy.view? (`read Organization`) plus EHR/VMG full plan and active organization membership. Forms are fetched from HealthieMigrationHelpers::CustomModuleForm.list with the charting category filter and serialized as CustomFormListItem entries.
- `GET /api/v1/clinical_form_templates/:id` — Fetch one charting form template by template id for an organization.
  - Params: `organization_id*`
  - Response: { form: { id, name, custom_modules: [{ id, label, sublabel, mod_type, required, position, options, options_array, hipaa_name, controls_conditional_modules, parent_custom_module_id, custom_module_form_section_id, custom_module_condition }] } | nil, errors: [] }
  - Note: Requires OrganizationPolicy.view? (`read Organization`) plus EHR/VMG full plan and active organization membership. Template is loaded with HealthieMigrationHelpers::CustomModuleForm.lookup(params[:id]). Missing template returns 404.
- `GET /api/v1/clinical_form_templates/intake/:intake_type` — Fetch the intake form template mapped to a specific intake_type.
  - Params: `intake_type*`
  - Response: { intake_form: { id, name, custom_modules: [{ id, label, sublabel, mod_type, required, position, options, options_array, hipaa_name, controls_conditional_modules, parent_custom_module_id, custom_module_form_section_id, custom_module_condition }] }, errors: [] }
  - Note: intake_type is translated to a template id via Healthie::Forms::TemplateMappings (currently history_and_development). Returns 400 for unmapped intake_type and 404 when mapped template is missing.

---

## AI Scribe

- `POST /api/v1/ai_scribe/clinical_note_drafts` — Generate AI draft answers for a clinical note form from free-text session notes. Intended to prefill charting fields before practitioner review/edit.
  - Params: `ai_scribe[user_input_text]* (or ai_scribe[user_input_textarea]* temporary mobile alias), ai_scribe[organization_id]*, ai_scribe[patient_id]*, ai_scribe[form_structure][][custom_module_id]*, ai_scribe[form_structure][][label]*, ai_scribe[form_structure][][sublabel], ai_scribe[form_structure][][mod_type]*`
  - Response: { draft_answers: { "<custom_module_id>": "<answer text>", ... } }
  - Note: Requires active membership in an EHR_FULL/VMG_FULL organization (for ai_scribe[organization_id]) and permission to update patient-related data (PatientPolicy.update_related_data?, practitioner-only). Only `textarea` fields are AI-populated; unsupported mod_type entries are ignored. Bad/invalid input shape raises 400 via AiScribe::BaseController.
- `POST /api/v1/ai_scribe/summarize_encounter` — Generate an AI summary of a completed encounter for clinical/internal workflow consumption.
  - Params: `encounter_id*`
  - Response: { summary }
  - Note: Loads encounter context (encounter, patient, appointment, clinical notes, and care services) into the AI prompt. Requires permission to update patient-related data on the encounter's patient (PatientPolicy.update_related_data?, practitioner-only). Missing encounter returns 404; malformed params return 400.
- `POST /api/v1/ai_scribe/summarize_encounter_for_caregiver_audience` — Generate a caregiver-facing version of an encounter summary using a prompt tuned for parents/caregivers and care-team readability.
  - Params: `encounter_id*`
  - Response: { summary }
  - Note: Uses the same encounter data inputs as practitioner summarize_encounter (encounter/patient/appointment/clinical notes/care services) but a different AI prompt template. Requires PatientPolicy.update_related_data? on the encounter's patient (practitioner-only). Missing encounter returns 404; malformed params return 400.

---

## Exercises

- `POST /api/v1/exercises` — Create a new exercise for a patient and link it to a goal.
  - Params: `exercise[title]*, exercise[description], exercise[frequency]* ("daily"|"weekly"), exercise[end_date]*, exercise[occurrences_per_week] (required when frequency=weekly), exercise[patient_id]*, exercise[practitioner_id], exercise[goal_id]*`
  - Response: { id, title, description, frequency, end_date, occurrences_per_week, created_at, updated_at, exercise_progresses: [...], patient: { ... } }
  - Note: Requires PatientPolicy.show? on patient and ExercisePolicy.create? (checked against a dummy exercise). ExerciseCreator validates patient/practitioner/goal, creates initial not_started ExerciseProgress, links goal, tracks Mixpanel, and enqueues UpdatePatientLastActionJob.
- `GET /api/v1/exercises/:id` — Fetch one exercise with patient context and ordered progress history.
  - Params: `none`
  - Response: { id, title, description, frequency, end_date, occurrences_per_week, created_at, updated_at, exercise_progresses: [{ ... }], patient: { ... } }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.view?.
- `PUT|PATCH /api/v1/exercises/:id` — Update editable exercise fields.
  - Params: `exercise[title], exercise[description], exercise[frequency] ("daily"|"weekly"), exercise[end_date], exercise[occurrences_per_week]`
  - Response: { id, title, description, frequency, end_date, occurrences_per_week, created_at, updated_at, exercise_progresses: [{ ... }], patient: { ... } }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.update?. Validation errors are returned as 422.
- `DELETE /api/v1/exercises/:id` — Delete an exercise and its dependent progress/files/goal links.
  - Params: `none`
  - Response: No content (HTTP 204)
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.destroy?.
- `GET /api/v1/exercises/:id/current_progress` — Return the exercise's current progress snapshot (active progress or latest completed fallback).
  - Params: `none`
  - Response: { id, effective_date, exercise_id, status, notes, created_at, updated_at, completion_date }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.view?. Prefers ExerciseProgress.active_for_exercise; falls back to most recent progress. Returns 404 when no progress exists.
- `GET /api/v1/workspaces/:workspace_id/exercises` — Legacy placeholder entry; no api/v1 exercises index route is currently defined.
  - Params: `none`
  - Response: No success payload (endpoint route/action not available).
  - Note: config/routes.rb exposes exercises create/show/update/destroy/current_progress only.

---

## Exercise Files

- `GET /api/v1/exercises/:exercise_id/exercise_files` — List files attached to an exercise.
  - Params: `none`
  - Response: Array of { id, name, content_type, size, thumbnail_url, file_url, created_at, updated_at, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.view? on exercise.
- `POST /api/v1/exercises/:exercise_id/exercise_files` — Attach a file to an exercise (direct-upload blob or multipart upload).
  - Params: `blob_id OR file[attachment]*`
  - Response: { file: { id, name, content_type, size, thumbnail_url, file_url, created_at, updated_at, hls_streaming_url, video_processing_status, video_ready_for_streaming }, exercise_file_count }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.update? on exercise. For blob_id uploads, blob must already exist in storage. Tracks Mixpanel event \"Exercise File Created\".
- `GET /api/v1/exercises/:exercise_id/exercise_files/:id` — Fetch one exercise attachment file.
  - Params: `none`
  - Response: { id, name, content_type, size, thumbnail_url, file_url, created_at, updated_at, hls_streaming_url, video_processing_status, video_ready_for_streaming }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.view? on exercise.
- `DELETE /api/v1/exercises/:exercise_id/exercise_files/:id` — Remove an exercise attachment file.
  - Params: `none`
  - Response: { exercise_file_count }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.destroy? on exercise. Deletes the file record and tracks Mixpanel event \"Exercise File Deleted\".
- `PUT /api/v1/exercises/:exercise_id/exercise_files/signed_url` — Generate a direct-upload signed URL for an exercise file attachment.
  - Params: `filename*, content_type*, size*, checksum`
  - Response: { signed_url, blob_id, key, headers: { "Content-Type" } }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.update? on exercise. Uses DirectUploadResponse helper; returned blob_id can be finalized through exercise_files#create.

---

## Exercise Progress

- `GET /api/v1/exercise_progresses/:id` — Fetch one exercise progress record.
  - Params: `none`
  - Response: { id, effective_date, exercise_id, status, notes, created_at, updated_at, completion_date }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.view? on exercise.
- `PUT|PATCH /api/v1/exercise_progresses/:id` — Update an exercise progress entry (status/notes) and advance scheduling when completion is recorded.
  - Params: `exercise_progress[status], exercise_progress[notes]`
  - Response: { id, effective_date, exercise_id, status, notes, created_at, updated_at, completion_date }
  - Note: Requires PatientPolicy.show? on exercise patient and ExercisePolicy.update_progress?. ExerciseProgressUpdater sets completion_date when status becomes completed, may create or move the next not_started progress record, tracks Mixpanel events, and enqueues UpdatePatientLastActionJob.

---

## Referrals

- `GET /api/v1/referrals` — List recent referrals created by the current user.
  - Params: `none`
  - Response: Array of { ...ReferralSerializer fields... }
  - Note: Uses policy_scope over Referral.by_referrer(current_user).recent and returns newest referrals first.
- `POST /api/v1/referrals` — Create and dispatch a new referral invitation by email, SMS, or share-link workflow.
  - Params: `referral[referee_email], referral[referee_phone], referral[referee_first_name], referral[referee_last_name], referral[referral_method]* (email|sms|share), referral[message], referral[status], referral[sent_at]`
  - Response: { ...ReferralSerializer fields... }
  - Note: Requires ReferralPolicy.create?. After save, send_referral updates status and delivery behavior by method (email sends mailer immediately, sms marks sent with sent_at, share marks sent without outbound delivery).
- `GET /api/v1/referrals/:id` — Fetch one referral and its referral link details.
  - Params: `none`
  - Response: { ...ReferralSerializer fields... }
  - Note: Requires ReferralPolicy.show? (referrer or admin).
- `PUT|PATCH /api/v1/referrals/:id` — Update editable referral fields before completion.
  - Params: `referral[referee_email], referral[referee_phone], referral[referee_first_name], referral[referee_last_name], referral[referral_method] (email|sms|share), referral[message], referral[status], referral[sent_at]`
  - Response: { ...ReferralSerializer fields... }
  - Note: Requires ReferralPolicy.update? (referrer or admin). Validation failures return HTTP 422 with errors array.
- `DELETE /api/v1/referrals/:id` — Delete a referral record.
  - Params: `none`
  - Response: HTTP 204 No Content
  - Note: Requires ReferralPolicy.destroy? (referrer or admin).
- `GET|POST /api/v1/referrals/:id/accept_referral` — Handle referral-link acceptance flow. GET renders a confirmation page; POST creates or refreshes invite state and redirects the referee into invitation acceptance.
  - Params: `none`
  - Response: GET renders HTML accept_referral page; POST redirects to portal error page or accept-invitation URL with invitation_token.
  - Note: Public endpoint (skips API auth). POST only proceeds when referral status is created or sent and referee is not already a registered user; creates or updates user invitation, ensures practitioner profile exists, sets practitioner referral_source to referral_link, and marks referral accepted.
- `POST /api/v1/referrals/:id/cancel` — Cancel a previously sent referral before it is accepted.
  - Params: `none`
  - Response: { ...ReferralSerializer fields... }
  - Note: Requires ReferralPolicy.cancel? (referrer-only and referral must be cancelable). Sets status to cancelled.

---

## Practitioners

- `POST /api/v1/practitioners` — Create or complete the current user's practitioner profile and return full practitioner details.
  - Params: `practitioner[first_name], practitioner[last_name], practitioner[phone_number], practitioner[email], practitioner[street_address], practitioner[apartment_suite], practitioner[city], practitioner[state], practitioner[zip], practitioner[primary_license_state], practitioner[referral_source], practitioner[license_type_id], practitioner[bio], practitioner[professional_title], practitioner[user_npi], practitioner[marketplace_status], practitioner[enrolling_in_insurance], practitioner[caqh_username], practitioner[caqh_password], practitioner[specialization_ids][], practitioner[language_ids][], practitioner[age_range_ids][], practitioner[care_settings][], practitioner[service_area_coordinates][{lat,lng}][], practitioner[top_specialization_ids][]`
  - Response: { ...PractitionerSerializer fields... }
  - Note: Uses Exchange::Interactors::Practitioners::CreatePractitionerOrganizer. Creates practitioner for current_user when missing, assigns practitioner portal role, then updates practitioner attributes atomically.
- `GET /api/v1/practitioners/:id` — Fetch a compact practitioner profile payload for profile and selection flows.
  - Params: `none`
  - Response: { id, first_name, last_name, avatar_url, title, professional_title, primary_license_state, referral_source, phone_number, email, license_type_id, bio, can_create_patients, specializations, top_specializations, user_npi, marketplace_status, vmg_signup_status }
  - Note: Loads practitioner by id and returns PractitionerBasicInfoSerializer. No explicit Pundit authorization is applied in this action.
- `PUT|PATCH /api/v1/practitioners/:id` — Update practitioner profile, including service area geometry, top specializations, and linked user NPI value.
  - Params: `practitioner[first_name], practitioner[last_name], practitioner[phone_number], practitioner[email], practitioner[street_address], practitioner[apartment_suite], practitioner[city], practitioner[state], practitioner[zip], practitioner[primary_license_state], practitioner[referral_source], practitioner[license_type_id], practitioner[bio], practitioner[professional_title], practitioner[user_npi], practitioner[marketplace_status], practitioner[enrolling_in_insurance], practitioner[caqh_username], practitioner[caqh_password], practitioner[specialization_ids][], practitioner[language_ids][], practitioner[age_range_ids][], practitioner[care_settings][], practitioner[service_area_coordinates][{lat,lng}][], practitioner[top_specialization_ids][]`
  - Response: { ...PractitionerSerializer fields... }
  - Note: Runs in a transaction and updates practitioner fields, optionally rewrites service-area polygon and top specializations, then saves practitioner.user with optional user_npi change. Mixpanel Practitioner Updated event is sent on success.
- `GET /api/v1/practitioners/:id/basic_info` — Fetch a compact practitioner profile payload for profile and selection flows.
  - Params: `none`
  - Response: { id, first_name, last_name, avatar_url, title, professional_title, primary_license_state, referral_source, phone_number, email, license_type_id, bio, can_create_patients, specializations, top_specializations, user_npi, marketplace_status, vmg_signup_status }
  - Note: Loads practitioner by id and returns PractitionerBasicInfoSerializer. No explicit Pundit authorization is applied in this action.

---

## Invitations

- `PUT /api/v1/invitations/accept_invitation` — Accept a Devise invitation token, set password, and return auth tokens for immediate login.
  - Params: `invitation_token* (top-level or invitation[invitation_token]), password*, password_confirmation* (top-level, user[..], or invitation[..])`
  - Response: { success, message, user: { ... }, auth_headers: { ... } }
  - Note: Public endpoint (skips API auth). Validates token exists, invitation not already accepted, then calls user.accept_invitation! and returns token-auth headers from create_new_auth_token.
- `POST /api/v1/invitations/caregiver` — Invite a caregiver user to join a workspace.
  - Params: `invitation[first_name]*, invitation[last_name]*, invitation[email]*, invitation[phone_number], invitation[workspace_id]*, invitation[relationship], invitation[invitation_reason], invitation[invited]`
  - Response: { success, membership: { id, workspace_id, user_id, role, relationship, consent_status, consent_required, invited_by_id, consent_at, consent_expires_at }, invitation_delayed, message }
  - Note: Requires inviter membership in workspace with consent_granted? and explicit `invite WorkspaceMembership` permission. Uses User.invite_caregiver!, CaregiverService.find_or_create_by!, and workspace.invite_caregiver!. Invitation email is deferred until consent is granted.
- `POST /api/v1/invitations/practitioner` — Invite a practitioner user to join a workspace.
  - Params: `invitation[first_name]*, invitation[last_name]*, invitation[email]*, invitation[phone_number], invitation[workspace_id]*, invitation[relationship], invitation[secondary_type], invitation[invitation_reason], invitation[invited]`
  - Response: { success, membership: { id, workspace_id, user_id, role, relationship, consent_status, consent_required, invited_by_id, consent_at, consent_expires_at }, invitation_delayed, message }
  - Note: Requires inviter membership with active consent and `invite WorkspaceMembership` permission. Uses User.invite_practitioner!, PractitionerService.find_or_create_by!, and workspace.invite_practitioner! with pending consent. Invitation email is deferred until consent is granted.
- `POST /api/v1/invitations/school` — Placeholder school invitation action; method currently contains no implementation.
  - Params: `none`
  - Response: No explicit payload (empty action).
  - Note: Action currently has TODO-only body in controller. No invitation workflow is executed.

---

## Guardian Invitations

- `GET /api/v1/guardian_invitations` — List guardian invitations visible to the current user.
  - Params: `none`
  - Response: Array of { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement }
  - Note: Uses GuardianInvitation.for_user(current_user), matching either invited_user_id or caregiver user email.
- `GET /api/v1/guardian_invitations/:id` — Placeholder show route from resources; no show action is implemented in Api::V1::GuardianInvitationsController.
  - Params: `none`
  - Response: No success payload. Request raises ActionNotFound.
  - Note: routes.rb defines a guardian_invitations resource with index/show, but controller currently implements index plus member workflow actions only.
- `POST /api/v1/guardian_invitations/:id/accept` — Accept a pending guardian invitation and record consent acceptance.
  - Params: `user_agreement_id`
  - Response: { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement }
  - Note: Invitation is scoped by GuardianInvitation.for_user(current_user). Requires invitation pending and unexpired. Optionally accepts explicit guardian_consent agreement id; otherwise uses latest guardian consent agreement. On success sets accepted/consent timestamps, records UserAgreementAcceptance snapshot, and ensures PatientCaregiver association exists.
- `POST /api/v1/guardian_invitations/:id/create_new_workspace` — Finalize accepted guardian invitation by attaching guardian to an existing caregiver workspace or creating a new caregiver-owned workspace copy.
  - Params: `none`
  - Response: { message, workspace: { id, name }, patient/caregiver_patient/original_patient: { ... } }
  - Note: Invitation must be accepted and have consent_given. If caregiver workspace already exists for the patient, current guardian is added there as manager. Otherwise creates new caregiver patient/workspace via PatientService.create_for_caregiver, re-points original patient workspace, triggers workspace/payment-method propagation, adds inviting practitioner and assigned practitioners, and marks duplicate_checked=true.
- `GET /api/v1/guardian_invitations/:id/current_agreement` — Return the latest guardian consent agreement content rendered for the inviting practitioner.
  - Params: `none`
  - Response: { agreement: { id, version, title, content, created_at, agreement_type } }
  - Note: Invitation is scoped by GuardianInvitation.for_user(current_user). Uses UserAgreementService.latest_guardian_consent_agreement_for_practitioner(invited_by). Returns 404 when no guardian consent agreement is configured.
- `POST /api/v1/guardian_invitations/:id/merge_with_patient` — Mark invitation as merged with an existing caregiver-owned patient to avoid duplicate patient records/workspaces.
  - Params: `target_patient_id*`
  - Response: { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement }
  - Note: Invitation must already be accepted. target_patient must be owned_by_user(current_user) or request is forbidden. merge_with_patient! sets invitation status=merged, links merged_with_patient, moves original patient to target workspace, triggers propagation, adds inviting practitioner if missing, and invites previously assigned practitioners.
- `GET /api/v1/guardian_invitations/:id/potential_duplicates` — Return candidate duplicate caregiver-owned patients after invitation acceptance, so guardian can choose merge vs new workspace.
  - Params: `none`
  - Response: { potential_duplicates: [{ id, name, date_of_birth, workspace_id, created_at }] }
  - Note: Invitation must be accepted. Invitation is scoped by GuardianInvitation.for_user(current_user). Candidates are limited to current user's accessible, user-created (non-organization) patients with matching first/last name, excluding the invitation patient itself.
- `POST /api/v1/guardian_invitations/:id/reject` — Reject a pending guardian invitation.
  - Params: `none`
  - Response: { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement }
  - Note: Invitation is scoped by GuardianInvitation.for_user(current_user). Reject is allowed only when invitation is pending and unexpired.
- `POST /api/v1/guardian_invitations/:id/resend` — Resend an existing pending guardian invitation email.
  - Params: `none`
  - Response: { message, invitation: { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement } }
  - Note: Invitation is scoped by GuardianInvitation.for_user(current_user). Only pending invitations can be resent; resend extends expiration by 12 months and dispatches invitation email flow.
- `POST /api/v1/patients/:patient_id/guardian_invitations` — Create (or resend existing pending) guardian invitation for a patient.
  - Params: `guardian_invitation[first_name]*, guardian_invitation[last_name]*, guardian_invitation[email]*, guardian_invitation[phone_number], guardian_invitation[relationship]*`
  - Response: { id, first_name, last_name, name, email, phone_number, relationship, status, accepted_at, rejected_at, expires_at, consent_required, consent_given_at, duplicate_checked, created_at, updated_at, can_accept, can_reject, can_resend, expired, consent_given, consent_agreement_content, consent_agreement_version, patient: { ... }, invited_by: { ... }, caregiver: { ... }, invited_user, merged_with_patient, user_agreement }
  - Note: Requires PatientPolicy.update? on patient. First ensures caregiver user/profile and PatientCaregiver association via PatientCaregiverService.add_caregiver, then GuardianInvitation.create_invitation! sends invitation email (or resends existing pending invite for same patient+caregiver).

---

## User Agreements

- `GET /api/v1/user_agreements` — List all user agreements available in the system.
  - Params: `none`
  - Response: Array of { id, agreement_type, version, title, content, created_at, updated_at }
  - Note: Authenticated endpoint; returns unfiltered UserAgreement records.
- `GET /api/v1/user_agreements/:id` — Fetch one user agreement by ID.
  - Params: `none`
  - Response: { id, agreement_type, version, title, content, created_at, updated_at }
  - Note: Authenticated endpoint.
- `POST /api/v1/user_agreements/:id/accept` — Record the current user's acceptance of a user agreement version.
  - Params: `workspace_id`
  - Response: { message }
  - Note: Guardian consent agreement_type is rejected in this endpoint and must be accepted via guardian invitation workflow. Uses UserAgreementService.record_acceptance!, sets consented_by to current_user, and tracks Mixpanel User Agreement Accepted.
- `GET /api/v1/user_agreements/check_acceptances` — Return agreement acceptance records for the current user, optionally scoped to one workspace.
  - Params: `workspace_id`
  - Response: Array of { id, accepted_at, workspace_id, user_agreement, consented_by, snapshot_content }
  - Note: Filters current_user acceptance rows by workspace_id when provided; serializer includes agreement metadata and consented_by user summary.
- `GET /api/v1/user_agreements/latest` — Fetch the latest agreement version for a specific agreement type.
  - Params: `type`
  - Response: { id, agreement_type, version, title, content, created_at, updated_at }
  - Note: Uses UserAgreement.latest_for_type(type); returns null JSON if no agreement exists for the requested type.

---

## Notification Preferences

- `GET /api/v1/notification_preferences` — Fetch current user's notification preference settings.
  - Params: `none`
  - Response: { id, chat_notification_type, chat_notification_timing, summary_notifications_enabled, unread_email_notifications_enabled, work_day_only, appointment_email_reminders_enabled, appointment_sms_reminders_enabled, pause_until, notifications_paused, has_active_push_tokens, created_at, updated_at }
  - Note: Requires NotificationPreferencePolicy.show?. Controller auto-creates preference record if missing.
- `PUT|PATCH /api/v1/notification_preferences` — Update notification preference toggles and chat-notification behavior.
  - Params: `notification_preference[chat_notification_type], notification_preference[chat_notification_timing], notification_preference[summary_notifications_enabled], notification_preference[unread_email_notifications_enabled], notification_preference[work_day_only], notification_preference[appointment_email_reminders_enabled], notification_preference[appointment_sms_reminders_enabled]`
  - Response: { id, chat_notification_type, chat_notification_timing, summary_notifications_enabled, unread_email_notifications_enabled, work_day_only, appointment_email_reminders_enabled, appointment_sms_reminders_enabled, pause_until, notifications_paused, has_active_push_tokens, created_at, updated_at }
  - Note: Requires NotificationPreferencePolicy.update?. Validation/enum errors return 422. Tracks Mixpanel \"Notification Preferences Updated\".
- `GET /api/v1/notification_preferences/options` — Return available enum options for chat notification settings.
  - Params: `none`
  - Response: { chat_notification_types, chat_notification_timings }
  - Note: Enumerations come directly from NotificationPreference enums.
- `POST /api/v1/notification_preferences/pause` — Temporarily pause notifications for the current user.
  - Params: `duration_hours (float, default 2.0, allowed 0.1..24)`
  - Response: { message, pause_until, duration_hours }
  - Note: Requires NotificationPreferencePolicy.update? on current user's preference. Uses NotificationPreferenceService.pause_notifications_until and tracks Mixpanel pause event.
- `POST /api/v1/notification_preferences/unpause` — Clear notification pause state for the current user.
  - Params: `none`
  - Response: { message }
  - Note: Requires NotificationPreferencePolicy.update?. Uses NotificationPreferenceService.unpause_notifications and tracks Mixpanel unpause event.

---

## Calendar Preferences

- `GET /api/v1/calendar_preferences` — Fetch the current user's calendar color preferences used by the appointment calendar UI.
  - Params: `none`
  - Response: { block_color_mode, status_colors, practitioner_colors }
  - Note: If the user has no calendar_preference record yet, one is auto-created with default status color mappings before authorization/serialization.
- `PUT|PATCH /api/v1/calendar_preferences` — Update the current user's calendar color configuration (status-based or practitioner-based coloring and custom color maps).
  - Params: `calendar_preference[block_color_mode] ("status"|"practitioner"), calendar_preference[status_colors], calendar_preference[practitioner_colors]`
  - Response: { block_color_mode, status_colors, practitioner_colors }
  - Note: Updates only the current user's preference record (created on-demand if missing). status_colors keys must be valid Appointment::Status values and color values must be in CalendarPreference::ALLOWED_COLOR_NAMES; practitioner_colors keys must be numeric org_participant IDs and values valid color names. Validation failures return 422.

---

## Reference Data

- `GET /api/v1/age_ranges` — List all active age ranges, ordered by min_age ascending. Used for practitioner profile setup and marketplace filtering (e.g. "0-3", "3-5", "5-12").
  - Params: `none`
  - Response: Array of { id, label, min_age, max_age, is_active }
  - Note: Read-only reference data. No pagination. Results are cached and rarely change.
- `GET /api/v1/focus_areas` — List active focus areas used in practitioner profile and filtering experiences.
  - Params: `none`
  - Response: Array of { id, name }
  - Note: Returns only records where is_active=true.
- `GET /api/v1/icd_codes` — Search/list ICD diagnosis codes for practitioners with EHR access.
  - Params: `q (search text for code/display_name), page (1-based)`
  - Response: { icd_codes: [{ id, code, display_name, description, category }], pagination: { current_page, total_pages, total_count, per_page } }
  - Note: Requires current user practitioner with at least one active organization on an EHR full or VMG full plan. Uses fuzzy search + exact code matching, fixed per_page=50.
- `GET /api/v1/insurance_plans` — Search/list insurance plans for plan selection and policy entry flows.
  - Params: `q (payer_id/payer_name search), in_village_network (boolean), page (1-based)`
  - Response: { insurance_plans: [{ id, payer_id, payer_name, in_village_network }], pagination: { current_page, total_pages, total_count, per_page } }
  - Note: Uses fuzzy payer_name and payer_id matching; when in_village_network=true, filters to plans with external_candid_payer_id present. Fixed per_page=50.
- `GET /api/v1/organizations/:organization_id/insurance_plans/patient_appointments_list_for_organization` — Return insurance plans used in an organization's appointment data, for report filter dropdowns.
  - Params: `organization_id*`
  - Response: { insurance_plans: [{ id, payer_name }], errors: [] }
  - Note: Practitioner-only, requires EHR/VMG full + active org membership and OrganizationPolicy.view_appointment_reports?. Returns plans from InsurancePlan.used_in_organization_appointments ordered by payer name.
- `GET /api/v1/languages` — List active languages for practitioner profile and filtering UIs.
  - Params: `none`
  - Response: Array of { id, name, description, is_active }
  - Note: Returns active languages ordered alphabetically by name.
- `GET /api/v1/license_types` — List active practitioner license types.
  - Params: `none`
  - Response: Array of { id, name, is_active, created_at, updated_at }
  - Note: Returns active license types as raw model JSON (no serializer wrapper).
- `GET /api/v1/npi` — Lookup provider data from CMS NPI Registry by NPI number.
  - Params: `number*`
  - Response: Raw NPI Registry API response JSON (version 2.1 payload).
  - Note: Makes outbound GET to https://npiregistry.cms.hhs.gov/api/ with version=2.1. Returns 422 when number missing or upstream call fails.
- `GET /api/v1/specializations` — Return active practitioner specializations for profile forms and filters.
  - Params: `none`
  - Response: Array of { id, name, description, is_active, created_at, updated_at }
  - Note: Returns active specializations ordered by name.
- `GET /api/v1/subscription_plans` — List paid active subscription plans available for purchase.
  - Params: `none`
  - Response: Array of { id, name, display_name, description, amount_in_cents, interval, stripe_product_id, default_price }
  - Note: Authenticated endpoint. Filters out free plans and plans missing stripe_product_id. default_price is fetched from Stripe product catalog and may be null if unavailable.

---

## Consents

- `GET /api/v1/consents/term_length` — Return the default workspace consent term length shown to users.
  - Params: `none`
  - Response: { term_length, description }
  - Note: Currently hard-coded to ISO8601 duration P12M (12 months).

---

## Push Notifications

- `POST /api/v1/push_notification_tokens` — Register or reactivate a mobile/web push notification token for the current user and device.
  - Params: `push_notification_token[push_token]*, push_notification_token[push_token_type]* (apns|fcm|expo), push_notification_token[device_id]*, push_notification_token[device_name], push_notification_token[device_platform]* (ios|android|web), push_notification_token[environment] (development|production)`
  - Response: { id, user_id, push_token, push_token_type, device_id, device_name, device_platform, environment, status, last_used_at, created_at, updated_at }
  - Note: Authenticated endpoint. Reuses existing device token when present, reassigns token ownership on shared devices, and registers token with CometChat (CometChat registration failures are logged but do not fail token persistence).
- `DELETE /api/v1/push_notification_tokens` — Deactivate a push token for the current user and unregister it from CometChat.
  - Params: `push_notification_token[push_token]*, push_notification_token[device_id]*`
  - Response: HTTP 204 No Content
  - Note: Token lookup is scoped to current_user by push_token plus device_id. Performs CometChat unregister call before setting token status to inactive.

---

## Silna (Insurance Integration)

- `POST /api/v1/silna/benefits_checks/:id/report` — Generate or retrieve a Silna benefits-check PDF download URL for a completed benefits check.
  - Params: `none`
  - Response: { file_id, url }
  - Note: Requires PatientPolicy.show? on the check's patient, OrganizationPolicy.manage_insurance_policies_check? on the patient's organization, and insurance_claims_enabled organization access. Only complete checks are allowed; first successful generation stores external_silna_report_id for reuse.
- `GET /api/v1/silna/patient_plans/:patientPlanId/benefits_checks` — List benefits checks tied to a specific patient insurance policy and return latest status data for each check.
  - Params: `none`
  - Response: { policy_id, records: Array<{ id, external_silna_id, status, eligibility_status, date_verified, specialties, specialty_fields, created_at, updated_at }>, errors: [] }
  - Note: Resolves params.patientPlanId as local PatientInsurancePolicy id. Requires OrganizationPolicy.manage_insurance_policies_check? and insurance_claims_enabled for the patient's organization. Non-terminal checks are refreshed from Silna before serialization.
- `GET /api/v1/silna/providers` — Placeholder route for Silna provider lookup.
  - Params: `none`
  - Response: ActionNotFound (no providers action implemented in Api::V1::SilnaController)
  - Note: Route exists in routes.rb but controller does not define providers.
- `GET /api/v1/silna/service_locations` — Placeholder route for Silna service-location lookup.
  - Params: `none`
  - Response: ActionNotFound (no service_locations action implemented in Api::V1::SilnaController)
  - Note: Route exists in routes.rb but controller does not define service_locations.

---

## Self-Service & Signups

- `GET /api/v1/self_service_signup_submission` — Return the latest saved self-service signup submission for the current user.
  - Params: `none`
  - Response: { id, feathery_user_id, data, summary_text }
  - Note: Returns HTTP 404 when no submission exists. Normalizes data.care_setting display strings to backend canonical care-setting labels before responding.
- `POST /api/v1/vmg_signups` — Submit a VMG provider-interest signup and notify the Village team.
  - Params: `vmg_signup[first_name]*, vmg_signup[last_name]*, vmg_signup[email]*, vmg_signup[phone_number], vmg_signup[license_type_id]*, vmg_signup[license_state], vmg_signup[zip_code], vmg_signup[referral_source], vmg_signup[practitioner_id], vmg_signup[interests][]`
  - Response: { success, message }
  - Note: Prevents duplicate pending submissions per practitioner, stores referral_id by matching current_user email when available, sends immediate internal email plus async provider confirmation email, and tracks Mixpanel VMG Signup Submitted.

---

## Summary

- **Total endpoints:** 377
- **Documented:** 377
- **Needing description:** 0
