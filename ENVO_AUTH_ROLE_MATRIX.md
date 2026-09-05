# ENVO Auth and Role Matrix

Verified locally on 2026-09-05 against `feat/support-safety` after database migration and seed.

## Authentication Flow

Telegram `initData` or development identity -> Telegram signature validation -> `TelegramIdentity`/`User` upsert -> role from application context -> persisted `AuthSession` -> signed access token -> `/me` and role-protected routes.

Access tokens contain the user, session and app context. Every protected request verifies the signature, persisted session ownership, expiry/revocation, user status and required role. Refresh tokens are hashed in the database and rotated. Development mock auth is disabled in production.

## Roles

Canonical application roles are `CLIENT`, `DRIVER`, `ADMIN` and `SUPPORT`. No conflicting `PASSENGER`, `COURIER` or `OPERATOR` authentication role was found. Domain labels such as passenger are not authentication roles.

| Endpoint / capability | CLIENT | DRIVER | ADMIN | Additional rule |
| --- | --- | --- | --- | --- |
| `GET /me` | Allow | Allow | Allow | Valid active session |
| Public trip search/read | Allow | Allow | Allow | Public availability rules |
| `GET /bookings/mine` | Allow | Deny | Deny | Client ownership |
| Create booking hold/request | Allow | Deny | Deny | Client role plus trip/seat rules |
| `GET /trips/mine` | Deny | Allow | Deny | Driver profile; safe own read |
| Create/publish trip | Deny | Allow | Deny | Approved driver and approved vehicle |
| Driver booking accept/reject | Deny | Allow | Deny | Approved driver and owned trip |
| Boarding/no-show/Start PIN | Deny | Allow | Admin has separate operations | Approved driver and owned booking/trip |
| Messages | Participant | Participant | No general inspector | Conversation membership |
| Support ticket read/write | Own | Own | Operator routes | Requester ownership or Admin/Support guard |
| Admin users | Deny | Deny | Allow | Backend role guard |
| Admin driver verification | Deny | Deny | Allow | Backend role guard |
| Admin trips | Deny | Deny | Allow | Backend role guard |
| Admin support | Deny | Deny | Allow | Backend role guard |
| Admin rewards/fraud | Deny | Deny | Allow | Backend role guard |

## Verified Security Smoke

- Client, approved Driver and Admin mock sessions: role correct and `/me` HTTP 200.
- Missing and invalid bearer token: HTTP 401.
- Client and Driver against Admin users: HTTP 403.
- Client against trip creation and Driver against booking hold creation: HTTP 403.
- Pending/not-submitted Driver against trip creation: HTTP 403.
- Approved Driver booking decision: HTTP 200 for an owned fixture.
- Temporarily downgraded owner against booking decision and boarding: no resource access (HTTP 404); status restored to APPROVED after the check.
- Logout: `/me` changed from HTTP 200 to 401 using the revoked access token.
- Persisted session forced past expiry: `/me` HTTP 401.
- Repeated login for the same Telegram ID resolved to the same User; the database has unique Telegram identity constraints.
- Client booking, messages and support reads; Driver own trips, messages and support reads; Admin users, verification, trips, support, rewards and moderation reads: HTTP 200.

## `/me` Contract

The existing response supplies id, status, canonical roles, names, username, avatar, phone, locale/theme, terms/profile completion, role-specific client or driver profile, active session count and timestamps. Driver profile includes onboarding and verification state. This is sufficient for initial frozen Client, Driver and Admin authentication integration. Vehicle context should continue through existing vehicle endpoints rather than expanding `/me` prematurely.

## Telegram Foundation

Status: READY for integration. The existing validator checks required fields, length, timestamp age, Telegram HMAC and malformed/forged payloads. `TelegramIdentity.telegramUserId` is unique and existing identities are linked to their User transactionally. Real Telegram smoke still requires the appropriate bot token and genuine `initData`; local verification correctly uses the production-disabled mock route.

## Frontend API Readiness

Status: PARTIAL but not blocking Trips Core. Client, Driver and Admin panels already send bearer tokens and cookies. Generated API-client functions accept `RequestInit`, so authorization headers can be supplied. There is not yet one shared token/session provider: Client and Driver keep tokens in component state while Admin stores one in localStorage. Do not redesign frozen pages in this phase; introduce a shared integration boundary when real frontend wiring starts, including refresh/logout handling and avoiding durable browser storage where possible.

## Remaining Auth Work

- Real Telegram end-to-end validation needs bot credentials and Telegram launch context.
- Role checks are centralized, but ownership and approved-driver checks remain domain helpers/routes; retain targeted authorization tests as domains are integrated.
- OpenAPI auth response schemas are generic/incomplete in places, so generated types are not the only contract source.
- Health readiness is unrelated to auth and still does not probe database/Redis.

Auth/RBAC is ready to proceed to Trips Core locally. Booking lifecycle, matching, Fill, Return, Protection, rewards, parcels and uploads were not changed here.
