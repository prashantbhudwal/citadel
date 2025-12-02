import { GeniusLyricsService } from './GeniusLyricsService'
import { geniusApi } from './ky'

const artists = [{ name: 'eminem', id: '45' }]

export async function getLyrics() {
  const artistId = artists[0].id

  const lyricsService = new GeniusLyricsService({ api: geniusApi, delay: 1000 })

  const songs = lyricsService.fetchSongsForArtist({ artistId })
  return songs
}
