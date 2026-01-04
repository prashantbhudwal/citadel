import { fetchSongMetadata } from '@/server/lyrics/genius-api'
import { inngest } from '../client'
import { persistSongMetadata } from '@/server/lyrics/db'

export const syncMetadata = inngest.createFunction(
  {
    id: 'sync-metadata',
    concurrency: {
      limit: 10,
    },
    throttle: {
      limit: 5,
      period: '1s',
    },
  },
  { event: 'songs.sync.metadata_requested' },
  async function ({ step, event }) {
    const songId = event.data.songId
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
