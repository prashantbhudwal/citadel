import { inngest } from '../client'
import { syncMetadata } from './sync-metadata'
import { syncLyrics } from './sync-lyrics'

export const processPage = inngest.createFunction(
  { id: 'process-page' },
  { event: 'songs.process_page_requested' },
  async ({ event, step }) => {
    const { songs } = event.data as {
      songs: Array<{ id: number; url: string }>
    }

    console.log(`Processing page with ${songs.length} songs...`)

    await Promise.all(
      songs.map((song) =>
        step.invoke(`sync-metadata-${song.id}`, {
          function: syncMetadata,
          data: { songId: song.id },
        }),
      ),
    )

    await Promise.all(
      songs.map((song) =>
        step.invoke(`sync-lyrics-${song.id}`, {
          function: syncLyrics,
          data: { songId: song.id, songUrl: song.url },
        }),
      ),
    )

    console.log(`✅ Processed ${songs.length} songs`)
    return { processed: songs.length }
  },
)
