# dibs

`dibs` is a small self-hosted garage sale catalog. Public visitors can browse published items and use an external contact link. Only the owner can manage listings.

## Local Development

1. Install dependencies:

```sh
pnpm install
```

2. Copy `.env.example` to `.env` and fill in the values.

3. Start PostgreSQL, then run migrations:

```sh
pnpm db:migrate
```

4. Start the app:

```sh
pnpm dev
```

The public catalog is at `http://localhost:5173`; the admin area is at `/admin`.

## Environment Variables

Required:

- `DATABASE_URL`
- `ADMIN_EMAIL` or `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `UPLOAD_DIR`
- `BODY_SIZE_LIMIT` for production multipart request size, default `10M` in Docker Compose
- `PUBLIC_SITE_URL`
- `ORIGIN` when running the production Node server behind Docker or a proxy
- `PUBLIC_CONTACT_LABEL`
- `PUBLIC_CONTACT_URL_TEMPLATE`

`PUBLIC_CONTACT_URL_TEMPLATE` supports `{title}` and `{url}` placeholders. URL-encoded placeholders like `%7Btitle%7D` and `%7Burl%7D` are also handled. For WhatsApp, use a `wa.me` URL with your phone number in international format without the leading `+`, spaces, or punctuation.

`ORIGIN` must match the browser origin used to access the app, for example `http://localhost:3000` for local Docker Compose or `https://dibs.example.com` in production. SvelteKit uses this for CSRF protection on admin form posts.

Photo uploads are validated by the app at 5 MB per file. `BODY_SIZE_LIMIT` must be larger than the largest expected multipart upload request; Docker Compose defaults it to `10M`.

## Admin Password Hash

Generate a bcrypt hash:

```sh
pnpm password:hash "your-admin-password"
```

Use the printed value as `ADMIN_PASSWORD_HASH`.

## Database Commands

```sh
pnpm db:generate  # generate Drizzle migrations from schema changes
pnpm db:migrate   # apply migrations
pnpm db:seed      # optional sample items
```

## Docker Compose

Set `ADMIN_PASSWORD_HASH` and `SESSION_SECRET`, then run:

```sh
docker compose up --build
```

Compose starts PostgreSQL and the app, applies migrations, serves the app on `http://localhost:3000`, and stores uploads in the `uploads_data` volume. If you browse through `http://127.0.0.1:3000`, start Compose with `ORIGIN=http://127.0.0.1:3000` as well.

## Standalone Docker / Coolify

The included Dockerfile builds a standalone app image. The default container command is:

```sh
node scripts/migrate.mjs && node build
```

That means the same image can run directly in Coolify without Docker Compose, as long as Coolify provides PostgreSQL separately.

Coolify setup:

- Create a PostgreSQL resource in Coolify.
- Deploy this repository as a Dockerfile-based app.
- Expose internal port `3000`.
- Set `DATABASE_URL` to the PostgreSQL resource connection string.
- Set `ORIGIN` and `PUBLIC_SITE_URL` to the public HTTPS URL for the app.
- Set `UPLOAD_DIR=/app/uploads`.
- Set `BODY_SIZE_LIMIT=10M` or larger if you want to allow bigger image upload requests.
- Add a persistent volume mounted at `/app/uploads`.
- Uploaded photos are written under `UPLOAD_DIR`, so they persist across rebuilds as long as the volume remains mounted.

Required app environment variables for Coolify:

```txt
DATABASE_URL=postgres://...
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD_HASH=...
SESSION_SECRET=...
UPLOAD_DIR=/app/uploads
BODY_SIZE_LIMIT=10M
PUBLIC_SITE_URL=https://your-dibs-domain.example
ORIGIN=https://your-dibs-domain.example
PUBLIC_CONTACT_LABEL=Message owner
PUBLIC_CONTACT_URL_TEMPLATE=https://wa.me/15555555555?text=Hi%2C%20I%27m%20interested%20in%20the%20%7Btitle%7D%3A%20%7Burl%7D
```

## Quality Checks

```sh
pnpm check
pnpm build
```
