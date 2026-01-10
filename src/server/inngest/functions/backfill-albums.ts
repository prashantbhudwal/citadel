import { inngest } from '../client'
import { db } from '@/server/prisma'
import { syncMetadata } from './sync-metadata'

/**
 * One-off function to trigger metadata sync for ALL songs.
 * Used to backfill missing data (e.g. albums) for existing songs.
 */
export const backfillAlbums = inngest.createFunction(
  { id: 'backfill-albums' },
  { event: 'admin.backfill_albums_requested' },
  async ({ step }) => {
    // 1. Fetch only songs that need backfill
    const songs = await step.run('fetch-incomplete-songs', async () => {
      return db.song.findMany({
        where: {
          OR: [
            // Case 1: Never fetched
            { metadataFetchedAt: null },
            // Case 2: Fetched but has NO albums linked
            {
              metadataFetchedAt: { not: null },
              albums: { none: {} },
            },
          ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    })

    console.log(`Starting backfill for ${songs.length} songs...`)

    // 2. Trigger sync-metadata for each song in batches
    // We use sendEvent to fan-out, letting the throttled function handle the load
    const BATCH_SIZE = 100
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE)

      await step.sendEvent(
        `trigger-batch-${i}`,
        batch.map((song) => ({
          name: 'songs.sync.metadata_requested',
          data: { songId: song.id },
        })),
      )

      // Small sleep to avoid overloading Inngest event ingestion if millions of songs
      // (Not strictly necessary for 2k songs, but good practice)
      await step.sleep(`sleep-${i}`, '1s')
    }

    return { triggered: songs.length }
  },
)
