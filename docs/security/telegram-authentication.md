# Telegram Authentication Security

The API validates Telegram Mini App `initData` with the official data-check-string and HMAC flow. Validation covers `hash`, `auth_date`, user JSON, malformed payloads, duplicate critical fields, payload size, and freshness.

Bot context is explicit:

- `CLIENT_APP` uses `TELEGRAM_CLIENT_BOT_TOKEN` and grants `CLIENT`.
- `DRIVER_APP` uses `TELEGRAM_DRIVER_BOT_TOKEN` and grants `DRIVER`.
- `ADMIN_WEB` is not authenticated from Telegram Mini App initData in this phase.
- `LOCAL_MOCK` behavior is represented by the dedicated mock endpoint and is disabled in production.

The API must not log raw `initData`, hashes, bot tokens, access tokens, refresh tokens, or secrets. Logs may include request ID, internal user ID, Telegram user ID, app context, role, result, and failure category.

Mock auth requires `NODE_ENV !== production` and `AUTH_MOCK_ENABLED=true`.
