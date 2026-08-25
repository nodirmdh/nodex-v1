# Local Development

## Start Infrastructure Only

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Start Apps in Docker

```bash
docker compose --profile apps up
```

## URLs

- Client Mini App: `http://localhost:3000`
- Driver Mini App: `http://localhost:3001`
- Admin Web: `http://localhost:3002`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`
- MinIO console: `http://localhost:9101`
- Mailpit: `http://localhost:18025`
- Storybook: `http://localhost:6006`

PostgreSQL is exposed on `localhost:15432` to avoid conflicts with local database installs.

Bots run in disabled mode when tokens are missing.
