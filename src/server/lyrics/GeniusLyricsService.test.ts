import { describe, it, expect, vi } from 'vitest'
import { GeniusLyricsService } from './GeniusLyricsService'
import { geniusApi } from './ky'
import { sampleSong } from './mock-data'

describe('GeniusLyricsService', () => {
  it('should instantiate correctly', () => {
    const service = new GeniusLyricsService({ api: geniusApi, delay: 0 })
    expect(service).toBeDefined()
    expect(service.api).toBe(geniusApi)
  })

  it('should transform song to scrape target', () => {
    const service = new GeniusLyricsService({ api: geniusApi, delay: 0 })
    const target = service.transformToScrapeTarget(sampleSong)
    expect(target).toEqual({
      id: 1,
      title: 'Sample Song',
      url: 'https://genius.com/Sample-Artist-Sample-Song-lyrics',
    })
  })

  it('should run batch scraping', async () => {
    const service = new GeniusLyricsService({ api: geniusApi, delay: 0 })

    // Mock scrapeLyrics to avoid network calls
    vi.spyOn(service, 'scrapeLyrics').mockResolvedValue('Mock Lyrics')

    const generator = service.runScraper({ songs: [sampleSong] })
    const results = []
    for await (const result of generator) {
      results.push(result)
    }

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      id: 1,
      title: 'Sample Song',
      url: 'https://genius.com/Sample-Artist-Sample-Song-lyrics',
      lyrics: 'Mock Lyrics',
    })
  })
})

import { extractLyricsFromHtml } from './GeniusLyricsService'

describe('extractLyricsFromHtml', () => {
  it('should extract lyrics from data-lyrics-container', () => {
    const html = `
      <html>
        <body>
          <div data-lyrics-container="true">
            Line 1<br>Line 2
          </div>
        </body>
      </html>
    `
    const lyrics = extractLyricsFromHtml(html)
    expect(lyrics).toBe('Line 1\nLine 2')
  })

  it('should return null if no lyrics found', () => {
    const html = '<html><body><div>No lyrics here</div></body></html>'
    const lyrics = extractLyricsFromHtml(html)
    expect(lyrics).toBeNull()
  })
})
