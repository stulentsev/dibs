# Agent Notes

## Package Runner Availability

- pnpm 11.5.0 is managed globally by Mise and should resolve through `~/.local/share/mise/shims/pnpm`. Before setting up database-backed verification, check `command -v pnpm` and `mise current pnpm`; if Mise reports it installed but the shim is absent, run `mise reshim`.
- `npm run check` and `npm run db:generate` are usable fallbacks because they execute the existing local dependencies without changing the lockfile.
- Running Playwright through `npm` does not fully avoid this issue: `playwright.config.ts` currently starts Vite with `pnpm dev`. Make `pnpm` available before starting the temporary database, or the e2e run will fail at the web-server step.

## Drizzle Migration Safety

- Always inspect newly generated SQL before accepting it. The historical `drizzle/meta/0000_snapshot.json` is empty even though `0000_initial_catalog.sql` creates the initial schema; this caused the first generated follow-up migration to emit duplicate `CREATE TYPE` and `CREATE TABLE` statements.
- `drizzle/meta/0001_snapshot.json` now provides a full schema baseline for later generations. Future migrations should be incremental, but still confirm that their SQL does not recreate existing objects.
- The Playwright global setup drops the e2e schema and runs the full migration chain, which verifies a clean install. For migrations that transform existing values, separately check the upgrade path with representative legacy rows; a clean-schema run cannot prove the data conversion.

## E2E Testing Friction

- Type-checking (`pnpm check`, or the `npm run check` fallback above) runs cleanly in the normal sandbox.
- `pnpm test:e2e ...` needs permission to bind a local Vite server. In the sandbox it can fail before tests run with `listen EPERM` on localhost.
- The Playwright config expects PostgreSQL at `postgres://dibs:dibs@localhost:5432/dibs_e2e` unless `E2E_DATABASE_URL` is set.
- `docker compose up -d postgres` is not enough as written:
  - Compose still interpolates required `app` variables, so provide harmless placeholders:
    ```sh
    ADMIN_PASSWORD_HASH=placeholder SESSION_SECRET=placeholder docker compose up -d postgres
    ```
  - The Compose Postgres service exposes `5432/tcp` inside Docker but does not publish it to `localhost:5432`.
- To run e2e tests against the Compose Postgres container without changing `docker-compose.yml`, inspect the container IP and pass it explicitly:
  ```sh
  docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dibs-postgres-1
  E2E_DATABASE_URL=postgres://dibs:dibs@<container-ip>:5432/dibs_e2e pnpm test:e2e e2e/catalog.spec.ts
  ```
- Stop the temporary database afterwards if you started it only for verification:
  ```sh
  ADMIN_PASSWORD_HASH=placeholder SESSION_SECRET=placeholder docker compose stop postgres
  ```
