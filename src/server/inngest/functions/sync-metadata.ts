import { fetchSongMetadata } from '@/server/lyrics/genius-api'
import { inngest } from '../client'
import { persistSongMetadata } from '@/server/lyrics/db/db'
import { db } from '@/server/prisma'

export const syncMetadata = inngest.createFunction(
  {
    id: 'sync-metadata',
    concurrency: {
      limit: 10,
    },
    throttle: {
      limit: 3,
      period: '1s',
    },
  },
  { event: 'songs.sync.metadata_requested' },
  async function ({ step, event }) {
    const songId = event.data.songId

    const shouldFetch = await step.run('check-if-fetched', async () => {
      const song = await db.song.findUnique({
        where: { id: songId },
        select: {
          metadataFetchedAt: true,
          _count: { select: { albums: true } },
        },
      })

      // Fetch if:
      // 1. Never fetched
      // 2. Fetched but has NO albums linked (backfill needed)
      return !song?.metadataFetchedAt || song._count.albums === 0
    })

    if (!shouldFetch) {
      return { skipped: true, songId }
    }

    const { metadata } = await step.run(
      `fetch_metadata-${songId}`,
      async () => await fetchSongMetadata({ songId: songId }),
    )

    await step.run(
      `persist-metadata-${songId}`,
      async () => await persistSongMetadata(songId, metadata),
    )
  },
)
