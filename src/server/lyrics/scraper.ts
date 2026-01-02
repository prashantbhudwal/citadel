import ky from 'ky'
import { extractLyricsFromHtml } from './parseHtml'
import { SongSchema } from './schemas'
import z from 'zod'
import { wait } from './wait'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
export type ScrapeTarget = {
  id: number
  title: string
  url: string
}
type TSong = z.infer<typeof SongSchema>

async function scrapeLyrics(target: ScrapeTarget): Promise<string | null> {
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

export function transformToScrapeTarget(song: TSong): ScrapeTarget {
  return {
    id: song.id,
    title: song.title,
    url: song.url,
  }
}

async function* runScraper({ songs }: { songs: TSong[] }) {
  for (const song of songs) {
    const target = transformToScrapeTarget(song)
    const lyrics = await scrapeLyrics(target)

    if (lyrics) {
      yield { ...song, lyrics }
    }

    await wait()
  }
}
