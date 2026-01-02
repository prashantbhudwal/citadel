import z from 'zod'
import { inngest } from '../client'
import { SongSchema } from '@/server/lyrics/schemas'
import { geniusApi } from '@/server/lyrics/ky'

const SongsResponseSchema = z.object({
  response: z.object({
    songs: z.array(SongSchema),
    next_page: z.number().nullable(),
  }),
})
type TSong = z.infer<typeof SongSchema>

async function fetchSongsPage({
  artistId,
  page,
}: {
  artistId: string
  page: number
}): Promise<{ songs: Array<TSong>; nextPage: number | null }> {
  const json: unknown = await geniusApi
    .get(`artists/${artistId}/songs`, {
      searchParams: {
        page: String(page),
        per_page: '50',
        sort: 'popularity',
        text_format: 'html,markdown',
      },
    })
    .json()

  const result = SongsResponseSchema.safeParse(json)
  if (!result.success) {
    throw result.error
  }
  return {
    songs: result.data.response.songs,
    nextPage: result.data.response.next_page,
  }
}
export const fetchSongs = inngest.createFunction(
  { id: 'fetch-songs' },
  { event: 'songs.fetch_requested' },
  async function ({
    event: {
      data: { artistId, maxPages },
    },
    step,
  }) {
    let page: null | number = 1
    const allSongs: Array<TSong> = []
    while (page) {
      const currentPage: number = page
      console.log(`Fetching page ${currentPage}...`)
      try {
        const { nextPage, songs } = await step.run(
          `fetch-song-page-${currentPage}`,
          async function (): Promise<{
            songs: Array<TSong>
            nextPage: number | null
          }> {
            const result = await fetchSongsPage({ artistId, page: currentPage })
            return result
          },
        )
        console.log(
          `Page ${currentPage}: fetched ${songs.length} songs. Next page: ${nextPage}`,
        )

        if (songs.length === 0) {
          console.log(`No songs found on page ${currentPage}. Stopping.`)
          break
        }

        allSongs.push(...songs)
        page = nextPage

        if (maxPages && page && page > maxPages) {
          console.log(`Reached max pages (${maxPages}). Stopping.`)
          break
        }

        if (page) {
          await step.sleep(`delay-page-${currentPage}`, '1s')
        }
      } catch (e) {
        console.error(`Error fetching page ${currentPage}:`, e)
        throw e
      }
    }
    console.log('⚛️ total songs', allSongs.length)
    return allSongs
  },
)
