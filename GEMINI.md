# Citadel Project Context

## Project Overview

Citadel is a **local-first music data pipeline** that fetches artist discographies from the Genius API, stores them in a local SQLite database, and will eventually embed lyrics using OpenAI for analysis.

## Tech Stack

- **Framework**: TanStack Start (React + Vinxi)
- **Database**: SQLite via Prisma ORM
- **Orchestration**: Inngest (durable workflow engine)
- **API Client**: `ky` for HTTP requests to Genius API
- **Validation**: Zod schemas

## Architecture

### Directory Structure

```
src/server/
├── inngest/
│   ├── client.ts         # Inngest client instance
│   ├── events.ts         # Event type definitions (Zod-validated)
│   ├── functions/        # Individual Inngest functions
│   │   └── sync-songs.ts # Fetches and persists songs per page
│   └── workflows/
│       └── citadel.ts    # Top-level pipeline orchestrator
├── lyrics/
│   ├── genius-api.ts     # Genius API fetch logic (pure function)
│   ├── db.ts             # Prisma persistence logic (pure function)
│   ├── schemas.ts        # Zod schemas for Genius API responses
│   └── legacy/           # Old code, do not use for new features
└── prisma/
    └── index.ts          # Prisma client export
```

### Key Patterns

1. **Thin Orchestrators**: Inngest functions should be thin wrappers that call pure functions from `src/server/lyrics/`.
2. **Inline Fetch & Persist**: For large datasets, fetch and persist per-page within the same loop to avoid memory issues and ensure durability.
3. **Unchecked Prisma Input**: When providing explicit IDs (`id: song.id`), use foreign key fields (`primaryArtistId`) instead of relation objects (`primaryArtist: { connect }`).

## Database Schema Notes

- **IDs are Genius IDs**: `Artist.id`, `Album.id`, and `Song.id` are NOT auto-generated. They are the actual Genius API IDs.
- **Many-to-Many Relations**: `primaryArtists` and `featuredArtists` on Song are handled via a separate `update()` call after the initial `upsert()`.
- **Run `prisma generate`** after any schema changes.
- **Run `prisma db pull`** if you suspect the database and schema are out of sync.

## Inngest Conventions

- Event names: `entity.action_requested` (e.g., `songs.sync_requested`)
- Function IDs: kebab-case (e.g., `sync-songs`)
- Each durable checkpoint should be a separate `step.run()` call.
- Use `step.sleep()` for rate limiting between API calls.

## Common Commands

```bash
# Start dev server + Inngest
pnpm dev
npx inngest-cli@latest dev

# Type check
pnpm check

# Sync schema with database
npx prisma db pull
npx prisma generate

# Create migration
npx prisma migrate dev --name <description>
```

## Gotchas

- **Genius API Rate Limits**: Use 1-second delays between page fetches.
- **SQLite Write Locking**: Keep transactions short (≤50 items).
- **Prisma Type Conflicts**: If you see "Types of property 'primaryArtist' are incompatible", you're mixing Checked and Unchecked input modes.
