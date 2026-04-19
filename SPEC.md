SYSTEM SPEC: dibs MVP

You are building a web application called “dibs”.

This document is your authoritative system specification.

Do not treat this as a single implementation task.
You will implement this system incrementally, in phases.

You must:

follow the rules and invariants defined here
avoid introducing unnecessary complexity
prioritize correctness of reservation logic
optimize for a mobile-first user experience
1. Objective

Build a minimal web app that allows users to:

browse a list of items
temporarily reserve (“dibs”) items for a fixed time window
see which items are reserved or available

The system owner (admin) can:

manage items
mark items as no longer available (“gone”)

There is:

no purchasing
no checkout
no user-side claim flow
2. System constraints (non-negotiable)

You must adhere to these constraints:

Runtime & language
Use Bun
Use TypeScript
Database
Use SQLite
Use a single database file
Deployment
Must run as a single Docker container
Must be compatible with Coolify
Must support persistent storage for:
SQLite database
uploaded images
Infrastructure

Do NOT introduce:

Redis
external databases
message queues
background workers outside the main process
microservices
third-party authentication
3. Core entities

You must model the following entities.

3.1 Item

Represents a listed object.

Fields (conceptual):

id
title
description
price
status (available, reserved, gone)
timestamps
3.2 ItemImage
id
item_id
file path or URL
sort order

An item can have multiple images.

3.3 ItemLink
id
item_id
label
URL

An item can have multiple external links.

3.4 User (lightweight)
id
session identifier (persistent)
optional nickname
timestamps

This is NOT a full authentication system.

3.5 Reservation
id
item_id
user_id
status (active, expired, etc.)
reserved_at
reserved_until
expired_at (nullable)

You must preserve reservation history.

4. Core states

Each item must be in exactly one state:

available
reserved
gone

Definitions:

available: can be reserved
reserved: currently held by a user
gone: manually marked unavailable by admin

There is NO “claimed” state.

5. Reservation rules (critical)

These rules are the most important part of the system.

You must enforce them strictly.

5.1 Reservation duration
Default: 30 minutes
5.2 Eligibility

A user may only reserve an item if:

item is available
user has fewer than 3 active reservations
user is not violating rule 5.5
5.3 Exclusivity
Only one active reservation per item at any time
5.4 Expiry

When reserved_until passes:

reservation becomes inactive
item becomes available
unless item is already gone
5.5 No consecutive re-reservation

A user may NOT reserve the same item twice in a row.

If:

user A reserves item X
reservation expires

Then:

user A cannot reserve item X again immediately

User A may reserve item X again only if:

another user has held a reservation on item X in the meantime
5.6 Max active reservations
A user may have at most 3 active reservations
5.7 Admin override
Admin can mark any item as gone at any time
Admin actions are NOT blocked by reservation rules
6. Invariants (must always hold)

You must design the system so these are always true:

At most one active reservation per item
A user has at most 3 active reservations
The last reserver cannot immediately re-reserve
Item status reflects actual reservation state
Expiry is based on server time, not client
UI is NOT authoritative; server/database is authoritative
7. Reservation correctness requirements

You must handle:

Race conditions
If two users try to reserve simultaneously:
only one succeeds
the other fails cleanly
Expired-but-not-cleaned reservations
System must treat expired reservations as inactive
even if cleanup hasn’t run yet
Atomicity
Reservation creation must be atomic at DB level
8. User identity

You must implement lightweight identity:

generate persistent session ID
store in cookie or local storage
reuse across requests

Optional:

allow user to set nickname

Users must be able to:

reserve items
view their active reservations

Do NOT implement:

login/signup
passwords
OAuth
9. Admin capabilities

Admin must be able to:

create items
edit items
delete items
upload multiple images
manage image order
add/remove external links
mark item as gone
optionally revert to available
view reservations
Admin auth

Implement minimal auth:

password or secret-based access
configured via environment variables
10. UI requirements
General
mobile-first design
fast loading
simple layout
clear actions
Public UI

Must include:

item list/grid
item detail view
image gallery (mobile-friendly)
clear status display
“Dibs” button
“My reservations” view
Status visibility

Must be obvious:

available
reserved
gone
Mobile requirements
large tap targets
minimal scrolling friction
responsive images
stable layout
11. Real-time behavior

You should support near real-time updates.

Required behavior:

reservation updates propagate to other clients
expiry updates propagate
admin changes propagate

Preferred:

WebSockets

Fallback:

polling

System must still function correctly without real-time updates.

12. File handling

You must support:

multiple images per item
persistent storage (disk / mounted volume)

Keep it simple:

no external storage service
no complex processing pipeline
13. Expiration strategy

You must NOT rely on external schedulers.

Use a combination of:

reserved_until timestamps
lazy expiry checks during reads/writes
optional in-process periodic cleanup
14. Implementation strategy

You must NOT build everything at once.

You must proceed in phases.

15. Implementation phases
Phase 0 — Project setup

Goal:

working Bun + TypeScript app
Docker setup
SQLite initialization
Phase 1 — Data model

Goal:

define schema
create tables
establish DB access layer
Phase 2 — Reservation domain logic (highest priority)

Goal:

implement reservation rules independently of UI

Must include:

reserve item function
validation rules
anti-hoarding logic
expiry handling
atomic DB operations

Do NOT proceed to UI before this is correct.

Phase 3 — Public UI

Goal:

browsing and reserving items
Phase 4 — User identity

Goal:

persistent session-based user tracking
Phase 5 — Admin UI

Goal:

full item management
Phase 6 — Real-time updates

Goal:

synchronize clients
Phase 7 — Polish

Goal:

stability, UX improvements, deployment readiness
16. Prompting rules (for future tasks)

When implementing features:

16.1 Scope strictly

Each task must target ONE of:

schema
reservation logic
UI
admin
real-time
deployment
16.2 Restate rules

Each feature must explicitly respect:

max 3 reservations
no consecutive reservation
one active reservation per item
16.3 Prefer design → then code

For complex logic:

first define approach
then implement
16.4 Handle edge cases explicitly

Always consider:

race conditions
expired reservations
duplicate actions
missing user identity
16.5 Avoid stack creep

Do NOT introduce:

new services
unnecessary frameworks
extra infrastructure
17. Failure modes to avoid

You must avoid:

storing reservation only on item (loses history)
allowing multiple active reservations
letting same user re-reserve immediately
relying on client timers for correctness
mixing business logic into UI
overengineering infrastructure
18. Definition of done (MVP)

The system is complete when:

admin can manage items
items support multiple images
items support external links
users can reserve items
reservations expire correctly
no item can be double-reserved
max 3 reservations per user is enforced
no consecutive re-reservation is enforced
real-time or near-real-time updates work
system runs in a single Docker container with SQLite
19. Execution directive

You must:

treat this document as the source of truth
implement the system incrementally
validate correctness at each phase
prioritize reservation logic correctness over UI polish

Do not attempt to generate the entire system in one step.

Break work into small, verifiable units.

