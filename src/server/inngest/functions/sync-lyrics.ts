import { scrapeLyrics } from '@/server/lyrics/scraper'
import { persistLyrics } from '@/server/lyrics/db'
import { inngest } from '../client'

export const syncLyrics = inngest.createFunction(
  {
    id: 'sync-lyrics',
    concurrency: {
      limit: 10,
    },
    throttle: {
      limit: 5,
      period: '1s',
    },
  },
  { event: 'songs.sync.lyrics_requested' },
  async function ({ step, event }) {
    const songId = event.data.songId
    const songUrl = event.data.songUrl
    const lyrics = await step.run(
      `scrape-lyrics-${songId}`,
      async () => await scrapeLyrics({ songUrl: songUrl }),
    )

    await step.run(
      `persist-metadata-${songId}`,
      async () => await persistLyrics(songId, lyrics),
    )
  },
)
