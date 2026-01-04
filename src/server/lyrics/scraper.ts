import ky from 'ky'
import * as cheerio from 'cheerio'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

export function extractLyricsFromHtml(html: string): string | null {
  const $ = cheerio.load(html)
  let lyrics = ''

  // Selector 1: data-lyrics-container (modern Genius)
  const container = $('[data-lyrics-container="true"]')
  if (container.length > 0) {
    // Remove unnecessary elements before extracting text
    $('[data-exclude-from-selection="true"]').remove() // Header/description
    $('div[class^="LyricsHeader__Container"]').remove() // Header container
    $('span[style*="position:absolute"]').remove() // Invisible focus traps
    $('svg').remove() // Icons
    $('noscript').remove() // Empty placeholders

    container.find('br').replaceWith('\n')
    lyrics = container.text()
  } else {
    // Selector 2: .lyrics (older Genius)
    const oldContainer = $('.lyrics')
    if (oldContainer.length > 0) {
      lyrics = oldContainer.text()
    } else {
      const classContainer = $('div[class^="Lyrics__Container"]')
      if (classContainer.length > 0) {
        classContainer.find('br').replaceWith('\n')
        lyrics = classContainer.text()
      }
    }
  }

  if (!lyrics) {
    return null
  }

  return lyrics.trim()
}

export async function scrapeLyrics({
  songUrl,
}: {
  songUrl: string
}): Promise<string | null> {
  try {
    const html = await ky(songUrl, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    }).text()

    const lyrics = extractLyricsFromHtml(html)

    if (!lyrics) {
      console.warn(`No lyrics found for ${songUrl}`)
      return null
    }

    return lyrics
  } catch (error) {
    console.error(`Failed to scrape ${songUrl}:`, error)
    return null
  }
}
