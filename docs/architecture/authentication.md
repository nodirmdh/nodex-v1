# Authentication Architecture

Phase 1 uses one identity model for all product roles. `User` is the stable internal account, `TelegramIdentity` is the verified Telegram binding, and `UserRole` allows one user to hold `CLIENT`, `DRIVER`, `ADMIN`, and future `SUPPORT` roles.

Telegram Mini Apps authenticate through backend validation of `initData`. Client and Driver contexts use different bot tokens, so a Client Mini App payload cannot be reused as Driver authentication. Roles are assigned server-side from app context and database state, never from client-submitted role values.

Sessions use short-lived access tokens plus refresh sessions. Refresh tokens are stored only as hashes in `AuthSession`; rotation updates the hash and refresh replay revokes the session family. Product endpoints require an active user and a valid session.

Admin access is read-only in this phase. Admin users are created through seed or controlled environment-configured Telegram IDs, not through public registration or passwords.
