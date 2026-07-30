# Troubleshooting

## Docker Config Access Warning on Windows

If Docker prints an access warning for `C:\Users\user\.docker\config.json`, verify Docker Desktop is running and the current user can read Docker config. `docker compose config` can still work if the daemon is available.

## Missing Bot Tokens

This is expected locally. Bots log disabled state and exit without retry loops.

## API Client Generation

Foundation uses `artifacts/openapi.json` as a stable local OpenAPI input. Once API is running, regenerate that artifact from `http://localhost:4000/openapi.json`.

## Tailwind Classes Not Rendering

Check that each Next app has `postcss.config.mjs` and imports `@import "tailwindcss";` before `@nodex/ui` global styles.
