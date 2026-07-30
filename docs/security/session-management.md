# Session Management

Access tokens are short lived and carried with `Authorization: Bearer`. Refresh tokens are transported as HttpOnly cookies scoped to `/api/v1/auth` and are never stored in plaintext by the backend.

`AuthSession` stores `refreshTokenHash`, `sessionFamilyId`, app context, user agent, IP hash, expiration, last-used time, and revoke metadata. Refresh rotation replaces the hash. Reuse of an invalid refresh token is treated as replay and revokes the session family when the session can be identified.

Production cookies must use `HttpOnly`, `Secure`, a deliberate `SameSite` policy, and a restricted path. Refresh tokens must not be stored in `localStorage`; access tokens should remain in app memory.

Blocked or deleted users cannot use product endpoints. Logout revokes the current session, and logout-all revokes all active sessions for the user.
