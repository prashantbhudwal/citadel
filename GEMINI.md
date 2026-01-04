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
│   ├── client.ts           # Inngest client instance
│   ├── events.ts           # Event type definitions (Zod-validated)
│   ├── options.ts          # Shared Inngest serve options
│   ├── functions/
│   │   ├── sync-songs.ts     # Fetches and persists songs per page
│   │   ├── sync-metadata.ts  # Enriches songs with metadata (throttle: 10/s)
│   │   ├── sync-lyrics.ts    # Scrapes lyrics from Genius pages (throttle: 3/s)
│   │   ├── process-page.ts   # Fan-out: invokes metadata+lyrics for one page
│   │   └── process-songs.ts  # Post-processing for songs
│   └── workflows/
│       └── citadel.ts        # Top-level pipeline orchestrator
├── lyrics/
│   ├── genius-api.ts       # Genius JSON API fetch logic
│   ├── scraper.ts          # HTML scraping for lyrics (separate from API)
│   ├── parseHtml.ts        # Cheerio-based HTML cleanup
│   ├── db.ts               # Prisma persistence logic
│   ├── schemas.ts          # Zod schemas for Genius API responses
│   └── legacy/             # Old code, do not use for new features
└── prisma/
    └── index.ts            # Prisma client export
```

### Key Patterns

1. **Thin Orchestrators**: Inngest functions should be thin wrappers that call pure functions from `src/server/lyrics/`.
2. **Inline Fetch & Persist**: For large datasets, fetch and persist per-page within the same loop to avoid memory issues and ensure durability.
3. **Unchecked Prisma Input**: When providing explicit IDs (`id: song.id`), use foreign key fields (`primaryArtistId`) instead of relation objects (`primaryArtist: { connect }`).
4. **Two-Phase Data Enrichment**: Basic song data → metadata enrichment → lyrics scraping. Store raw lyrics in `lyrics`, processed in `processedLyrics`.
5. **Separate API vs Scraping**: Keep `genius-api.ts` (JSON API) separate from `scraper.ts` (HTML scraping) — different endpoints, auth, and rate limits.

## Database Schema Notes

- **IDs are Genius IDs**: `Artist.id`, `Album.id`, and `Song.id` are NOT auto-generated. They are the actual Genius API IDs.
- **Many-to-Many Relations**: `primaryArtists`, `featuredArtists`, and `writerArtists` on Song are handled via a separate `update()` call after the initial `upsert()`.
- **Tracking Timestamps**: Use `metadataFetchedAt` and `lyricsFetchedAt` to track enrichment state. Query `WHERE metadataFetchedAt IS NULL` for un-enriched songs.
- **Run `prisma generate`** after any schema changes.
- **Run `prisma db pull`** if you suspect the database and schema are out of sync.

## Inngest Conventions

- Event names: `entity.action_requested` (e.g., `songs.sync_requested`)
- Function IDs: kebab-case (e.g., `sync-songs`)
- Each durable checkpoint should be a separate `step.run()` call.
- Use `step.invoke()` to trigger child functions from a parent.
- **Use `throttle` for API rate limiting** (queues excess calls). Do NOT use `rateLimit` (rejects/drops excess calls).

```typescript
// ✅ Correct — throttle queues excess calls
throttle: { limit: 5, period: '1s' }

// ❌ Wrong — rateLimit rejects excess calls with error
rateLimit: { limit: 5, period: '1s' }
```

### 1000 Step Limit & Fan-Out Pattern

- **Each function has a 1000 step limit.** `step.run`, `step.invoke`, `step.sendEvent`, `step.sleep` each count as 1 step.
- **Fan-out pattern**: If processing N items, use a child function per batch to stay under the limit:
  - Parent (`sync-songs`) invokes `process-page` once per page (~4 steps/page)
  - Child (`process-page`) invokes `sync-metadata` and `sync-lyrics` per song (~100 steps/page)
  - Each child function has its own 1000 step budget.
- **`step.invoke` vs `step.sendEvent`**:
  - `step.invoke` — waits for child to complete (provides backpressure)
  - `step.sendEvent` — fire-and-forget (can flood the system if not careful)
- **Always use `Promise.all`** when invoking multiple child functions to leverage throttle config.

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

# Database snapshots
pnpm db:snapshot    # Creates timestamped backup + updates snapshot-latest.db
pnpm db:restore     # Archives current state, restores from snapshot-latest.db
pnpm db:analyze     # Generates statistical analysis to data/db-analysis.md
```

## Gotchas

- **Genius API Rate Limits**: Use 1-second delays between page fetches or `throttle` config.
- **Cloudflare Error 1015**: Flooding requests will get your IP blocked (10-60 min ban). Always use throttled functions with backpressure.
- **SQLite Write Locking**: Keep transactions short (≤50 items).
- **Prisma Type Conflicts**: If you see "Types of property 'primaryArtist' are incompatible", you're mixing Checked and Unchecked input modes.
- **Zod Nullable Fields**: API may return `null` for optional fields (e.g., `album`, `recording_location`). Use `.nullable()` in Zod schemas.
- **HTML Cleanup**: When scraping lyrics, remove `[data-exclude-from-selection]`, invisible spans, SVGs, and `LyricsHeader__Container` before extracting text.
- **Inngest Step Limit**: Functions exceeding 1000 steps fail with `InngestErrFunctionOverflowed`. Use fan-out pattern.
