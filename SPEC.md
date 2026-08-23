# SYSTEM SPEC: dibs MVP

This document is the authoritative specification for `dibs`.

`dibs` is a small self-hosted garage sale catalog for personal neighborhood use. It is not a marketplace, does not process payments, and does not provide user accounts or in-app messaging.

The system owner can manage listings through a protected admin area. Public visitors can browse published items and use an external contact link configured by environment variables.

## 1. Product Scope

Build a minimal app that allows the owner to:

- list spring-cleaning items to sell or give away
- upload and order item photos
- publish or hide listings
- mark item state as draft, available, claimed, gone, or hidden

Public visitors can:

- browse published available items
- view item details and photos
- use a configurable contact button that opens an external chat, email, or other URL

Public visitors cannot:

- create, edit, delete, reserve, or claim items in the app
- log in or create accounts
- message the owner inside the app

## 2. Reconciled Decisions

This spec replaces the earlier reservation-focused version of the project.

The following older ideas are intentionally out of scope:

- Bun runtime requirement
- SQLite single-file database
- user-side "dibs" reservations
- reservation expiry
- lightweight visitor identity
- max-active-reservation rules
- no-consecutive-re-reservation rules
- WebSocket or polling-based reservation updates
- item links as a core entity

The current app keeps the name `dibs`, but "dibs" is now a simple catalog name, not an in-app reservation mechanism.

## 3. Technical Stack

Use:

- SvelteKit
- TypeScript
- Vite/SvelteKit build pipeline
- `@sveltejs/adapter-node`
- PostgreSQL
- Drizzle ORM
- local disk uploads through a mounted Docker volume
- Dockerfile suitable for production
- `docker-compose.yml` for local testing
- Coolify-compatible container deployment

Do not use:

- Vercel-specific features or assumptions
- Next.js
- hosted Supabase services
- in-app messaging
- neighbor or public user accounts
- Redis, queues, or extra services beyond the app and PostgreSQL

## 4. Runtime and Deployment

Production must run the SvelteKit Node build with:

```sh
node build
```

The Docker build should run type checking before building unless there is a strong reason not to.

The app must be deployable with Docker Compose-compatible service definitions and be practical to run in Coolify.

Persistent storage is required for:

- PostgreSQL data
- uploaded item photos

Uploads must survive container rebuilds through a mounted volume, normally mounted at:

```sh
/app/uploads
```

## 5. Environment Variables

Required:

- `DATABASE_URL`
- `ADMIN_EMAIL` or `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `UPLOAD_DIR`
- `PUBLIC_SITE_URL`
- `PUBLIC_CONTACT_LABEL`
- `PUBLIC_CONTACT_URL_TEMPLATE`

`PUBLIC_CONTACT_URL_TEMPLATE` should support interpolation for the item title and URL. For example:

```txt
https://wa.me/15555555555?text=Hi%2C%20I%27m%20interested%20in%20the%20%7Btitle%7D%3A%20%7Burl%7D
```

The app should replace:

- `{title}` with the item title
- `{url}` with the public item URL

## 6. Data Model

### 6.1 items

Represents one catalog listing.

Fields:

- `id`
- `title`
- `description`
- `price_cents` nullable
- `is_free` boolean
- `status` enum: `draft`, `available`, `claimed`, `gone`, `hidden`
- `category` nullable
- `pickup_notes` nullable
- `published` boolean
- `created_at`
- `updated_at`

Public visibility rules:

- only published items may appear publicly
- hidden items must never appear publicly
- draft items must never appear publicly
- public homepage should show published available items
- item detail pages must not expose unpublished, draft, or hidden items

### 6.2 item_photos

Represents an uploaded item photo.

Fields:

- `id`
- `item_id`
- `path`
- `alt_text` nullable
- `sort_order`
- `created_at`

An item can have multiple photos.

The first photo by `sort_order` is the default card image unless thumbnails are implemented.

## 7. Public Catalog

Required routes:

- `/` public homepage with published available items
- `/items/[id]` public item detail page

Public item cards must show:

- title
- thumbnail or first photo
- price/free label
- category, when present
- status

Item detail pages must show:

- title
- description
- price/free label
- category, when present
- pickup notes, when present
- photo gallery
- status
- configurable contact button

Contact behavior:

- no in-app messaging
- contact button uses `PUBLIC_CONTACT_LABEL`
- contact button URL is generated from `PUBLIC_CONTACT_URL_TEMPLATE`
- default message should resemble:

```txt
Hi, I'm interested in the [item title]: [item URL]
```

## 8. Admin Area

Required routes:

- `/admin/login`
- `/admin`
- admin item create/edit/delete routes or equivalent actions

Admin area requirements:

- protected by password-based login
- single admin user is enough
- password must be checked against a secure hash
- admin sessions must use signed HTTP-only cookies
- admin routes must require authentication

Admin can:

- create item
- edit item
- delete item
- upload photos
- delete photos
- reorder photos when reasonable
- edit photo alt text when reasonable
- mark item as draft, available, claimed, gone, or hidden
- toggle `published`

## 9. Uploads and File Handling

Store uploaded files on local disk under `UPLOAD_DIR`.

Required validation:

- allow jpg, jpeg, png, and webp
- reject other file types
- enforce a 25 MB maximum source upload size
- resize uploaded images to a mobile-friendly display size
- prevent path traversal
- generate unique server-side filenames

Serving requirements:

- uploaded files are served by the app
- uploaded paths must not allow access outside `UPLOAD_DIR`

Thumbnail requirement:

- generating thumbnails is preferred if practical
- using the first uploaded image as the card image is acceptable for the MVP

## 10. Security Basics

Required:

- secure admin password hashing with argon2 or bcrypt
- signed HTTP-only admin session cookie
- server-side validation for all forms
- upload validation by type and size
- path traversal protection for uploaded filenames and served files
- no public access to unpublished, draft, or hidden items
- no public write actions
- admin route protection
- avoid leaking stack traces in production

CSRF protection should be considered for admin form actions. SameSite cookies and server-side auth checks are required at minimum.

## 11. UI Requirements

The UI should be:

- mobile-first
- clean and simple
- easy to scan in a neighborhood chat context
- usable without a complex design system

Use basic CSS or a minimal styling setup. Tailwind is acceptable only if it keeps the project simple.

Avoid:

- marketing-site structure
- complicated dashboards
- unnecessary animation
- heavy component abstractions

## 12. Build and Quality Commands

Required npm scripts:

- `npm run check` using `svelte-check`
- `npm run build`
- Drizzle migration generation script
- Drizzle migration apply script
- optional seed script with sample items

TypeScript should be used throughout.

## 13. Database and Migrations

Use Drizzle ORM with PostgreSQL.

Required:

- schema definitions
- migration generation setup
- migration apply script
- database access layer
- optional seed script with a few sample items

Migrations must be suitable for local Docker Compose and Coolify deployment workflows.

## 14. Docker and Coolify

Provide:

- production Dockerfile
- `docker-compose.yml` for local testing
- app service
- postgres service
- persistent postgres volume
- persistent uploads volume

Coolify deployment notes must explain:

- required environment variables
- PostgreSQL service requirement
- mounted upload volume requirement
- migration command or startup procedure
- how image uploads persist across rebuilds

## 15. README Requirements

README must include:

- local development setup
- environment variables
- database migration commands
- Docker Compose usage
- high-level Coolify deployment notes
- how to create `ADMIN_PASSWORD_HASH`
- upload volume notes

## 16. Implementation Phases

Build the system incrementally:

1. Project setup: SvelteKit, TypeScript, adapter-node, scripts
2. Database: Drizzle schema, migrations, connection layer
3. Admin auth: password hash verification and signed session cookie
4. Public catalog: homepage and item detail pages
5. Admin CRUD: item management and status publishing controls
6. Uploads: local image validation, storage, serving, and photo ordering
7. Docker: Dockerfile, Compose, volume wiring
8. Documentation: README, environment variables, Coolify notes
9. Polish: validation hardening, responsive layout, seed data

## 17. Definition of Done

The MVP is complete when:

- public users can browse published available items
- public users can view item details and use the configured contact button
- public users cannot write data
- admin can log in
- admin can create, edit, delete, publish, hide, and change item status
- admin can upload and manage multiple item photos
- uploaded images persist through container rebuilds
- unpublished, draft, and hidden items are not exposed publicly
- PostgreSQL schema and migrations are present
- SvelteKit build and type checking pass
- app runs with `node build`
- Docker Compose starts app and PostgreSQL with persistent volumes
- README documents local development and Coolify deployment
