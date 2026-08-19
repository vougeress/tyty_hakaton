# Database

PR-02A uses PostgreSQL 16 and Drizzle ORM. UI code must use `TripService` from
`lib/trips`; importing the Drizzle repository or schema from components is not
part of the public application contract.

## Local setup

```bash
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
```

The local container listens on port `5433` to avoid colliding with a PostgreSQL
instance on the default port. The seed is idempotent and creates the `Казань`
trip, invite code `KAZAN2026`, four participants, and four confirmed events.

Free gaps are derived from adjacent events. They are not persisted in PR-02A.

## Schema changes

Edit `db/schema.ts`, then generate and apply a migration:

```bash
npm run db:generate
npm run db:migrate
```

Use `npm run db:studio` to inspect local data.
