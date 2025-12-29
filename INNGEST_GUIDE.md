# The Citadel Inngest Manual

This is your primary reference for implementing the event-driven architecture in Citadel. It covers every primitive, pattern, and configuration you will need, replacing the official documentation for the scope of this project.

---

## 1. Core Mental Model

Inngest is not a "queue"; it is a **Durable Execution Engine**.

- **Standard Web:** Request $\rightarrow$ Code $\rightarrow$ Response. (Time limit: ~10s)
- **Inngest:** Event $\rightarrow$ **Durable Function** (Time limit: Days)

**The "Magic" of Durability:**
You write code that looks like a normal async function. Inngest automatically "checkpoints" it at every `step`. If the server crashes, restarts, or times out, Inngest resumes the function from the **last successful step**, restoring all variable state.

---

## 2. Setup & Configuration

### The Directory Structure

Follow this convention for Citadel:

```text
src/server/inngest/
├── client.ts       # The initialized client
├── events.ts       # Type definitions (Zod schemas)
└── functions/      # Your actual business logic
    ├── scrape.ts
    └── embed.ts
```

### 1. Define Your Events (`events.ts`)

Strict typing is mandatory. This prevents you from sending "track-parsed" when the listener expects "track.parsed".

```typescript
import { EventSchemas } from 'inngest'
import { z } from 'zod'

export const eventsMap = {
  // Triggered when a user requests an import
  'citadel/artist.import': z.object({
    artistId: z.string(),
    forceRefresh: z.boolean().default(false),
  }),
  // Triggered internally to process a single song
  'citadel/song.scrape': z.object({
    songId: z.number(),
    url: z.string().url(),
    title: z.string(),
  }),
} as const // <--- 'as const' is important for type inference

export type CitadelEvents = typeof eventsMap
```

### 2. Initialize the Client (`client.ts`)

This is the object you import everywhere to send events or define functions.

```typescript
import { Inngest } from 'inngest'
import { eventsMap } from './events'
import { EventSchemas } from 'inngest'

export const inngest = new Inngest({
  id: 'citadel', // Unique App ID
  schemas: new EventSchemas().fromSchema(eventsMap),
  // Optional: Middleware or Logger can be added here
})
```

---

## 3. The Function API

This is where 90% of your work happens. A function is a workflow triggered by an event.

### Basic Syntax

```typescript
import { inngest } from '../client'

export const myWorkflow = inngest.createFunction(
  { id: 'unique-function-id' }, // Config Object
  { event: 'citadel/artist.import' }, // Trigger
  async ({ event, step }) => {
    // The "Handler"
  },
)
```

### The `step` Object (CRITICAL)

You **must** wrap all side-effects (DB calls, API calls) in `step.run`.

#### `step.run(name, handler)`

Executes code **once**. The result is JSON-serialized and stored in Inngest's database.

- **On First Run:** Executes the handler.
- **On Retry:** Skips the handler, returns the stored JSON result instantly.

```typescript
const artist = await step.run('fetch-artist-data', async () => {
  // If this succeeds, the result is saved forever for this execution ID.
  return await genius.getArtist(event.data.artistId)
})
// 'artist' is now available for the rest of the function, even after a restart.
```

#### `step.sleep(id, duration)`

Pauses execution. Your server actually stops working on this task (freeing up resources). Inngest wakes it up later.

```typescript
// Wait 5 seconds to be polite to the API
await step.sleep('polite-wait', '5s')
```

#### `step.sendEvent(id, events)`

The "Fan-Out" mechanism. Triggers other functions in parallel.

```typescript
await step.sendEvent('dispatch-songs', [
  { name: 'citadel/song.scrape', data: { songId: 1 } },
  { name: 'citadel/song.scrape', data: { songId: 2 } },
])
```

---

## 4. Flow Control (Protecting APIs)

Citadel relies on external APIs (Genius, Spotify) that hate concurrency. Inngest manages this via the Config Object (1st argument of `createFunction`).

### `throttle` (Rate Limiting)

"Only allow X starts per time period."

- **Use Case:** Genius API limits.
- **Behavior:** Events pile up in a queue and are processed at the allowed speed.

```typescript
export const scrapeSong = inngest.createFunction(
  {
    id: "scrape-song",
    throttle: {
      limit: 10,   // Max 10 runs...
      period: "1m" // ...per minute
    }
  },
  { event: "citadel/song.scrape" },
  async ({ event, step }) => { ... }
);
```

### `concurrency` (Parallelism Limit)

"Only allow X functions to run at the same time."

- **Use Case:** Database load or preventing race conditions.
- **Behavior:** "The queue is processed 5 items at a time."

```typescript
{
  concurrency: {
    limit: 5 // Only 5 songs scraping at the exact same moment
  }
}
```

#### Advanced Concurrency: `key`

"Only allow 1 run _per artist_ at a time, but different artists can run in parallel."

```typescript
{
  concurrency: {
    limit: 1,
    key: "event.data.artistId" // 🔑 The Magic Key
  }
}
```

---

## 5. Sending Events (Triggering Workflows)

You can send events from your API routes, other functions, or scripts.

```typescript
import { inngest } from '@/server/inngest/client'

// This is an async call, but it returns almost instantly.
// It just hands the message to Inngest.
await inngest.send({
  name: 'citadel/artist.import',
  data: {
    artistId: '16775',
    forceRefresh: true,
  },
})
```

---

## 6. Error Handling & Retries

### Automatic Retries

By default, if `step.run` throws an error, Inngest **automatically retries** the function.

- Backoff: Exponential (it waits longer each time).
- Default: ~4 retries.

### Customizing Retries

```typescript
inngest.createFunction({
  id: "fragile-task",
  retries: 10 // Try 10 times before giving up
}, ...)
```

### `step.run` vs `try/catch`

If you `try/catch` inside `step.run` and swallow the error, Inngest thinks it **succeeded** and won't retry.

- **Good:** Let errors bubble up if you want a retry (Network error).
- **Bad:** Swallow errors if the data is invalid and retrying won't fix it.

```typescript
await step.run('fetch', async () => {
  try {
    await api.get()
  } catch (e) {
    if (e.status === 404) {
      // Don't retry 404s, they will never work.
      return null
    }
    throw e // Retry 500s or Network errors!
  }
})
```

---

## 7. The Citadel Patterns (Cheat Sheet)

### Pattern A: The Importer (Fan-Out)

**Goal:** Get Artist $\rightarrow$ Get 100 Songs $\rightarrow$ Scrape 100 Songs.

1.  **Function 1 (`import-artist`):**
    - `step.run`: Fetch song list from Genius.
    - `step.sendEvent`: Send 100 `citadel/song.scrape` events.
    - Ends immediately. Runtime: < 2s.

2.  **Function 2 (`scrape-song`):**
    - Config: `throttle: { limit: 2, period: "1s" }` (Genius polite mode).
    - `step.run`: Fetch HTML & Parse.
    - `step.run`: Embed text (OpenAI).
    - `step.run`: Save to DB.

### Pattern B: The Aggregator (Fan-In)

**Goal:** "Wait until all scraping is done, then calculate stats."
_Note: This is hard in distributed systems. For Citadel, we fake it._

- **Approach:** Don't wait. Just trigger a generic "Recalculate Stats" event every time a song is finished, but debounce it.
- **Better Approach (Scheduled):**
  - Cron function runs every hour: `citadel/stats.recalc`.
  - It checks "Which artists had activity recently?" and updates them.

### Pattern C: Idempotency (Safety)

Because retries happen, your code runs multiple times.

- **Inngest:** Guarantees `step.run` only executes once if it succeeds.
- **Database:** Use `upsert` (Update if exists, Insert if new) instead of `create`.

```typescript
await step.run('save-db', async () => {
  // SAFE: Upsert
  await prisma.lyrics.upsert({
    where: { songId: 123 },
    update: { text: '...' },
    create: { songId: 123, text: '...' },
  })
})
```

---

## 8. Local Development

You cannot run Inngest without the Dev Server.

1.  **Start your App:** `npm run dev` (Port 3000)
2.  **Start Inngest:** `npx inngest-cli@latest dev`
    - It auto-detects your app at `http://localhost:3000/api/inngest`.
3.  **Open Dashboard:** `http://127.0.0.1:8288`
    - Use this UI to click "Test" and fire events manually.

## 9. Deployment & The API Route (TanStack Start)

You need to expose an API endpoint that the Inngest Cloud (or local Dev Server) can talk to. This is where your app receives instructions to "Wake up and run function X".

**File:** `src/routes/api/inngest.ts`

```typescript
import { createAPIFileRoute } from '@tanstack/start/api'
import { serve } from 'inngest/edge' // Use edge adapter for Web Standard Request/Response
import { inngest } from '@/server/inngest/client'
import { fetchArtistSongs, scrapeSong } from '@/server/inngest/functions' // Import all your functions here

// 1. Create the handler
const handler = serve({
  client: inngest,
  functions: [
    fetchArtistSongs,
    scrapeSong,
    // Add all future functions here
  ],
  streaming: 'allow', // Recommended for TanStack Start / Vercel
})

// 2. Export the Route
export const Route = createAPIFileRoute('/api/inngest')({
  GET: ({ request }) => handler(request),
  POST: ({ request }) => handler(request),
  PUT: ({ request }) => handler(request),
})
```

**Environment Variables (Production):**

- `INNGEST_EVENT_KEY`: Get this from inngest.com.
- `INNGEST_SIGNING_KEY`: Get this from inngest.com.

```

```
