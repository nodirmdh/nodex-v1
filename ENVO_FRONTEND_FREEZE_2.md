# ENVO Frontend Freeze 2.0

- Freeze date: 2026-09-05
- Branch: `feat/support-safety`
- Starting HEAD: `dc87b968417630f0d2fbae7492f2062517369504`
- Client preview: https://nodex-client-preview.nodir-nodex.workers.dev
- Driver preview: https://nodex-driver-preview.nodir-nodex.workers.dev
- Admin preview: https://nodex-admin-preview.nodir-nodex.workers.dev

## Frozen status

- Client: V2 baseline complete; search, booking, seat selection, messages, rewards, matching, protection and parcel demo flows are available.
- Driver: V2 baseline complete; trip creation, requests, ENVO Fill, ENVO Return, active trip, support, reliability and parcel demo flows are available.
- Admin: V2 baseline complete; operational sections and legacy detail screens use consistent Russian operator copy.
- Frontend/demo completion estimate: 94%.

This freeze covers the current Client, Driver and Admin information architecture, ENVO visual language, icon system, Seat Map V3, product terminology and deterministic demo interactions. New features, large redesigns and product-logic changes start after this baseline.

## Product decisions

- Rewards use tickets, drawings, referrals and promo codes; tickets are not money or a wallet balance.
- Driver monetization is subscription-based: first three months free, then a paid subscription; no per-trip ENVO commission.
- `ENVO Fill`, `ENVO Return` and `ENVO Protection` remain branded feature names.
- Client support and trip conversations share the unified Messages experience.
- Seat availability, vehicle capacity and displayed booking price must remain aligned.

## Known limitations

- Demo actions use deterministic local state and do not persist across sessions.
- Uploaded support files are previewed locally and are not stored remotely.
- Maps, live location, notifications and real-time status updates are representative UI states.
- Some operator detail panels show stable saved data when remote data is unavailable.

## Backend-dependent items

- Authentication, roles and persistent user sessions.
- Persistent booking, matching, waitlist, support, parcel and trip state.
- Real file upload, moderation, notifications, maps and live vehicle location.
- Reliability events, protection replacement orchestration, audit history and analytics.
- Payments and driver subscription checkout remain deferred.
