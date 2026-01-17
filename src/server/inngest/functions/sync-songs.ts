import { inngest } from '../client'
import { fetchSongsPage, type TSong } from '@/server/lyrics/genius-api'
import { persistSongBatch } from '@/server/lyrics/db/db'
import { processPage } from './process-page'

export const syncSongs = inngest.createFunction(
  { id: 'sync-songs' },
  { event: 'songs.sync_requested' },
  async ({ event, step }) => {
    const { artistId, maxPages } = event.data
    let page: number | null = 1
    let totalSynced = 0

    while (page) {
      const currentPage: number = page
      console.log(`Fetching page ${currentPage}...`)

      try {
        const { songs, nextPage } = await step.run(
          `fetch-page-${currentPage}`,
          () => fetchSongsPage({ artistId, page: currentPage }),
        )

        if (songs.length > 0) {
          await step.run(`persist-page-${currentPage}`, () =>
            persistSongBatch(songs),
          )

          totalSynced += songs.length
          console.log(
            `Page ${currentPage}: synced ${songs.length} songs. Next: ${nextPage}`,
          )

          // Invoke the processPage child function for this page
          // This counts as 1 step, and the child function handles
          // all metadata + lyrics fetching with its own step limit
          await step.invoke(`process-page-${currentPage}`, {
            function: processPage,
            data: {
              songs: songs.map((s) => ({ id: s.id, url: s.url })),
            },
          })
        } else {
          console.log(`No songs on page ${currentPage}. Stopping.`)
          break
        }

        page = nextPage

        if (maxPages && page && page > maxPages) {
          console.log(`Reached max pages (${maxPages}). Stopping.`)
          break
        }

        if (page) {
          await step.sleep(`delay-before-page-${page}`, '1s')
        }
      } catch (e) {
        console.error(`Error on page ${currentPage}:`, e)
        throw e
      }
    }

    console.log(`✅ Total songs synced: ${totalSynced}`)
    return { totalSynced }
  },
)
