import { z } from 'zod'
import ky from 'ky'
import { SongSchema } from '../schemas'
import { geniusApiLegacy } from './genius-api-ky'
import { extractLyricsFromHtml } from '../parseHtml'
import type { TGeniusApi } from './genius-api-ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

type TSong = z.infer<typeof SongSchema>

const SongsResponseSchema = z.object({
  response: z.object({
    songs: z.array(SongSchema),
    next_page: z.number().nullable(),
  }),
})
async function fetchSongsPage({
  artistId,
  page,
}: {
  artistId: string
  page: number
}): Promise<{ songs: Array<TSong>; nextPage: number | null }> {
  const json: unknown = await geniusApiLegacy
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

export type ScrapeTarget = {
  id: number
  title: string
  url: string
}

export type GeniusLyricsServiceConfig = {
  api: TGeniusApi
  delay: number
}

export class GeniusLyricsService {
  public api: TGeniusApi
  public delay: number

  constructor({ api, delay = 1000 }: GeniusLyricsServiceConfig) {
    this.api = api
    this.delay = delay
  }

  wait() {
    return new Promise((resolve) => setTimeout(resolve, this.delay))
  }

  async fetchSongsForArtist({
    artistId,
    maxPages,
  }: {
    artistId: string
    maxPages?: number
  }): Promise<Array<TSong>> {
    let page: null | number = 1
    const allSongs: Array<TSong> = []
    while (page) {
      console.log(`Fetching page ${page}...`)
      try {
        const { nextPage, songs } = await fetchSongsPage({ artistId, page })
        console.log(
          `Page ${page}: fetched ${songs.length} songs. Next page: ${nextPage}`,
        )

        if (songs.length === 0) {
          console.log(`No songs found on page ${page}. Stopping.`)
          break
        }

        allSongs.push(...songs)
        page = nextPage

        if (maxPages && page && page > maxPages) {
          console.log(`Reached max pages (${maxPages}). Stopping.`)
          break
        }

        if (page) {
          await this.wait()
        }
      } catch (e) {
        console.error(`Error fetching page ${page}:`, e)
        throw e
      }
    }
    console.log('⚛️ total songs', allSongs.length)
    return allSongs
  }

  transformToScrapeTarget(song: TSong): ScrapeTarget {
    return {
      id: song.id,
      title: song.title,
      url: song.url,
    }
  }

  async scrapeLyrics(target: ScrapeTarget): Promise<string | null> {
    console.log(`Scraping lyrics for ${target.title} (${target.url})...`)
    try {
      const html = await ky(target.url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }).text()

      const lyrics = extractLyricsFromHtml(html)

      if (!lyrics) {
        console.warn(`No lyrics found for ${target.title}`)
        return null
      }

      return lyrics
    } catch (error) {
      console.error(`Failed to scrape ${target.title}:`, error)
      return null
    }
  }

  async *runScraper({ songs }: { songs: Array<TSong> }) {
    for (const song of songs) {
      const target = this.transformToScrapeTarget(song)
      const lyrics = await this.scrapeLyrics(target)

      if (lyrics) {
        yield { ...song, lyrics }
      }

      await this.wait()
    }
  }
}
