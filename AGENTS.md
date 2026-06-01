# Agent Notes

## E2E Testing Friction

- `pnpm check` runs cleanly in the normal sandbox.
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

