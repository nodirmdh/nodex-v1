# Local Development

## Start Infrastructure and API (PowerShell)

```powershell
pnpm install
$env:REDIS_HOST_PORT = "16387"
pnpm docker:up

$env:DATABASE_URL = "<local DATABASE_URL from .env.example>"
$env:REDIS_URL = "redis://localhost:16387"
$env:AUTH_MOCK_ENABLED = "true"
$env:NODE_ENV = "development"
$env:API_PORT = "14000"
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm --filter @nodex/api dev
```

Use `pnpm docker:down` to stop the local infrastructure without deleting named volumes. Do not add `-v`.


## URLs

- Client Mini App: `http://localhost:3000`
- Driver Mini App: `http://localhost:3001`
- Admin Web: `http://localhost:3002`
- API: `http://localhost:14000/api/v1`
- Swagger: `http://localhost:14000/docs`
- MinIO console: `http://localhost:9101`
- Mailpit: `http://localhost:18025`
- Storybook: `http://localhost:6006`

PostgreSQL is exposed on `localhost:15432`. Redis uses `localhost:16387` in the Windows setup because the default host port is reserved. The port overrides above are process-local PowerShell variables and contain no secrets.

Bots run in disabled mode when tokens are missing.
