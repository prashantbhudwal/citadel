import { GeniusLyricsService } from './GeniusLyricsService'
import { geniusApiLegacy } from './genius-api-ky'
import { dbService } from './db'

const artists = [{ name: 'eminem', id: '45' }]

export async function runScraper() {
  const artistId = artists[0].id
  const service = new GeniusLyricsService({ api: geniusApiLegacy, delay: 1000 })
  console.log(`Starting fetch for ${artists[0].name} (ID: ${artistId})`)

  const songs = await service.fetchSongsForArtist({ artistId, maxPages: 10 })
  console.log(`Fetched ${songs.length} songs`)

  try {
    console.log('Saving song list...')
    await dbService.songs.write({ songs, artistId })
  } catch (error) {
    console.error('Failed to persist song list', error)
    throw error
  }

  try {
    console.log(`Starting lyrics scrape for ${songs.length} songs...`)
    const generator = service.runScraper({ songs })

    for await (const data of generator) {
      try {
        console.log(`Saving lyrics for: ${data.title}`)
        await dbService.lyrics.append({
          artistId,
          lyricData: data,
        })
      } catch (error) {
        console.error(`Failed to write lyrics for ${data.title}`, error)
      }
    }
  } catch (error) {
    console.error('Lyrics scrape aborted', error)
    throw error
  }

  console.log('Done!')
}
