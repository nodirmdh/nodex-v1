# Authentication API

Base path: `/api/v1`

- `POST /auth/telegram`: validates Telegram `initData`, upserts user identity, assigns role from app context, creates a session, and returns an access token.
- `POST /auth/mock`: local/E2E-only deterministic login for `CLIENT_APP`, `DRIVER_APP`, and `ADMIN_WEB`.
- `POST /auth/refresh`: rotates refresh token and returns a new access token.
- `POST /auth/logout`: revokes current session.
- `POST /auth/logout-all`: revokes all active sessions for current user.
- `GET /auth/session`: returns current session summary.
- `GET /me`: returns current user, roles, preferences, and role-relevant profile.
- `PATCH /me`: updates allowed basic profile fields.
- `PATCH /me/preferences`: updates locale, theme, and notification preferences.
- `POST /me/accept-terms`: records current terms/privacy versions.
- `GET /me/sessions`: lists current user's sessions.
- `DELETE /me/sessions/:sessionId`: revokes one owned session.
- `GET /admin/users`: read-only admin users list.
- `GET /admin/users/:userId`: read-only admin user detail.

Errors follow the shared API error envelope with stable auth/profile error codes.
