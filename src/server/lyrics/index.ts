import { GeniusLyricsService } from './GeniusLyricsService'
import { geniusApi } from './ky'
import { fs } from './fs'

const artists = [{ name: 'eminem', id: '45' }]

async function main() {
  const artistId = artists[0].id
  const service = new GeniusLyricsService({ api: geniusApi, delay: 2000 }) // 2s delay to be safe

  console.log(`Starting scrape for ${artists[0].name} (ID: ${artistId})`)

  // Pass maxPages: 1 to limit for testing
  await service.runBatch({ artistId }, async (data) => {
    console.log(`Saving lyrics for: ${data.title}`)
    await fs.lyrics.append({
      artistId,
      lyricData: data,
    })
  })

  console.log('Done!')
}

main().catch(console.error)
