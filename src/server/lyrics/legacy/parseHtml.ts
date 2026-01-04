import * as cheerio from 'cheerio'

export function extractLyricsFromHtml(html: string): string | null {
  const $ = cheerio.load(html)
  let lyrics = ''

  // Selector 1: data-lyrics-container (modern Genius)
  const container = $('[data-lyrics-container="true"]')
  if (container.length > 0) {
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
