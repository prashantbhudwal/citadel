import ky from 'ky'
import { SongSchema } from '@/server/lyrics/schemas'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  const songIds = [235729, 43437]

  console.log(
    `Testing SongSchema (full details) against ${songIds.length} songs...`,
  )

  for (const id of songIds) {
    const url = `https://www.genius.com/api/songs/${id}`
    console.log(`Fetching song ${id}...`)
    try {
      const json: any = await ky
        .get(url, {
          headers: { 'User-Agent': USER_AGENT },
        })
        .json()

      const songData = json.response.song
      console.log(`Validating full song object for ${id}...`)

      const result = SongSchema.safeParse(songData)
      if (result.success) {
        console.log(`✅ Success for ${songData.title}`)
        if ((result.data as any).album) {
          console.log(`   Includes album: ${(result.data as any).album.name}`)
        } else {
          console.log(`   No album found (or null)`)
        }
      } else {
        console.error(`❌ Validation failed for ${songData.title}:`)
        console.error(JSON.stringify(result.error.format(), null, 2))
      }
    } catch (e) {
      console.error(`Error fetching song ${id}:`, e)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
}

run()
