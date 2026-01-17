# Agentic Development Guidelines

This document provides instructions for AI agents operating in this repository.

## 1. Project Overview & Architecture

**Citadel** is a local-first music data pipeline that fetches artist discographies from the Genius API, stores them in a local SQLite database, and will eventually embed lyrics using OpenAI for analysis.

### Tech Stack

- **Framework:** TanStack Start (React 19 + Vinxi)
- **Database:** SQLite via Prisma ORM
- **Orchestration:** Inngest (durable workflow engine)
- **API Client:** `ky` for HTTP requests to Genius API
- **Validation:** Zod schemas
- **Styling:** Tailwind CSS v4

### Architecture Directory Structure

```
src/server/
├── inngest/
│   ├── client.ts           # Inngest client instance
│   ├── events.ts           # Event type definitions (Zod-validated)
│   ├── options.ts          # Shared Inngest serve options
│   ├── functions/          # Inngest step functions
│   └── workflows/          # Top-level pipeline orchestrators
├── lyrics/
│   ├── genius-api.ts       # Genius JSON API fetch logic
│   ├── scraper.ts          # HTML scraping for lyrics
│   ├── db.ts               # Prisma persistence logic
│   └── schemas.ts          # Zod schemas for API responses
└── prisma/
    └── index.ts            # Prisma client export
```

### Key Architectural Patterns

1. **Thin Orchestrators:** Inngest functions should be thin wrappers that call pure functions from `src/server/lyrics/`
2. **Inline Fetch & Persist:** For large datasets, fetch and persist per-page to avoid memory issues
3. **Separate API vs Scraping:** Keep `genius-api.ts` (JSON API) separate from `scraper.ts` (HTML scraping)
4. **Two-Phase Data Enrichment:** Basic song data → metadata enrichment → lyrics scraping

### Database Schema Notes

- **IDs are Genius IDs:** `Artist.id`, `Album.id`, and `Song.id` are NOT auto-generated. They are the actual Genius API IDs
- **Many-to-Many Relations:** `primaryArtists`, `featuredArtists`, and `writerArtists` on Song are handled via separate `update()` call
- **Tracking Timestamps:** Use `metadataFetchedAt` and `lyricsFetchedAt` to track enrichment state
- **Run `pnpm prisma:generate`** after any schema changes

### Inngest Conventions

- Event names: `entity.action_requested` (e.g., `songs.sync_requested`)
- Function IDs: kebab-case (e.g., `sync-songs`)
- Each durable checkpoint should be a separate `step.run()` call
- Use `step.invoke()` for backpressure; `step.sendEvent` for fire-and-forget
- **Use `throttle` for API rate limiting** (queues excess). NEVER use `rateLimit` (rejects/drops)

### 1000 Step Limit & Fan-Out Pattern

- Each function has a 1000 step limit (`step.run`, `step.invoke`, `step.sendEvent`, `step.sleep` count as 1 step)
- **Fan-out pattern:** Use child functions per batch to stay under limit
- Always use `Promise.all` when invoking multiple child functions to leverage throttle config

## 2. Build, Lint, and Test Commands

Use `pnpm` for all package management and script execution.

- **Install Dependencies:** `pnpm install`
- **Build:** `pnpm build` (Runs `vite build`)
- **Dev Server:** `pnpm dev` (Runs `vite dev --port 3000`)
- **Lint:** `pnpm lint` (Runs `eslint`)
- **Format:** `pnpm format` (Runs `prettier`)
- **Fix Issues:** `pnpm fix` (Runs prettier write and eslint fix)
- **Type Check:** `pnpm check` (Runs `tsc --noEmit`)

### Testing

The project uses **Vitest**.

- **Run All Tests:** `pnpm test`
- **Run a Single Test File:** `pnpm vitest run <path/to/file>` (e.g., `pnpm vitest run src/utils.test.ts`)
- **Run Tests Matching a Pattern:** `pnpm vitest run <pattern>`

### Database & Backend

- **Generate Prisma Client:** `pnpm prisma:generate`
- **Push DB Changes:** `pnpm prisma:db:push`
- **Reset DB:** `pnpm reset` (CAUTION: Destructive)
- **Inngest Dev Server:** `pnpm inngest:dev`
- **DB Snapshot:** `pnpm db:snapshot` (Creates backup)
- **DB Restore:** `pnpm db:restore` (Restores from snapshot)
- **DB Analyze:** `pnpm db:analyze` (Generates stats to data/db-analysis.md)

## 3. Code Style & Conventions

### Formatting

- **Prettier:** Enforced via `prettier.config.js`. No semicolons, single quotes, trailing commas: all
- **Indentation:** 2 spaces

### TypeScript & Types

- **Strict Mode:** Enabled in `tsconfig.json`
- **Imports:** Use absolute imports with `@/` alias (e.g., `import { Button } from '@/components/ui/button'`)
- **Exporting:** Named exports for utilities; Default exports for pages/routes (TanStack Router requirement)

### React & UI

- **Framework:** React 19 with TanStack Start/Router
- **Styling:** Tailwind CSS v4. Use the `cn` utility (from `@/lib/utils`) for conditional class merging
- **Components:** Functional Components, PascalCase filenames, place UI components in `src/components/ui`
- **TanStack Router:** Routes defined in `src/routes` using `createFileRoute`

### Naming

- **Files/Folders:** kebab-case for general files, PascalCase for React components
- **Variables/Functions:** camelCase
- **Constants:** UPPER_CASE for global constants

### Shadcn UI

When adding new UI components, use the Shadcn CLI:

```bash
pnpx shadcn@latest add <component-name>
```

Do not manually copy-paste component code unless customizing an existing one.

### Error Handling

- Use standard `try/catch` blocks
- For API routes or server functions, ensure errors are properly logged and returned to the client in a consistent format

## 4. Critical Gotchas

- **Cloudflare Error 1015:** Flooding requests will get your IP blocked (10-60 min ban). Always use throttled functions with backpressure
- **Genius API Rate Limits:** Use 1-second delays between page fetches or `throttle` config
- **SQLite Write Locking:** Keep transactions short (≤50 items)
- **Prisma Type Conflicts:** If you see "Types of property 'primaryArtist' are incompatible", you're mixing Checked and Unchecked input modes
- **Zod Nullable Fields:** API may return `null` for optional fields. Use `.nullable()` in Zod schemas
- **Inngest Step Limit:** Functions exceeding 1000 steps fail with `InngestErrFunctionOverflowed`. Use fan-out pattern

## 5. Environment & Configuration

- **Node:** Node.js 20+
- **Package Manager:** pnpm (enforced via `packageManager` field)
- **Env Vars:** Managed via `.env`
