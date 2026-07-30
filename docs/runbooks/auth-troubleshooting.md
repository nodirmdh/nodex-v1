# Auth Troubleshooting

## Local API Fails To Start

Check `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `AUTH_ACCESS_TOKEN_SECRET`. In production, missing auth secrets fail fast by design.

## Telegram Login Fails

Verify the app context and matching bot token. Client payloads must be verified with the client bot token, and driver payloads with the driver bot token. Do not log raw `initData`; use failure category and request ID.

## Mock Login Fails

Mock auth works only when `NODE_ENV !== production` and `AUTH_MOCK_ENABLED=true`.

## Refresh Fails

Confirm the refresh cookie is present, scoped to `/api/v1/auth`, not expired, and belongs to an active non-revoked `AuthSession`.

## Admin Users Return Forbidden

Confirm the user has `ADMIN` in the database. Admin registration is not public; use seed or the controlled bootstrap path.
