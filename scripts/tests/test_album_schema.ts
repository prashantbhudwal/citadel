import ky from 'ky'
import { z } from 'zod'
import { AlbumSchema } from '@/server/lyrics/schemas'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  const songIds = [235729, 43437, 56832] // Rap God, The Monster, Berzerk (songs likely to have album data)

  console.log(`Testing AlbumSchema against ${songIds.length} songs...`)

  for (const id of songIds) {
    const url = `https://www.genius.com/api/songs/${id}`
    console.log(`Fetching song ${id}...`)
    try {
      const json: any = await ky
        .get(url, {
          headers: { 'User-Agent': USER_AGENT },
        })
        .json()

      const albumData = json.response.song.album
      if (albumData) {
        console.log(`Validating album for song ${id} (${albumData.name})...`)
        const result = AlbumSchema.safeParse(albumData)
        if (result.success) {
          console.log(`✅ Success for ${albumData.name}`)
        } else {
          console.error(`❌ Validation failed for ${albumData.name}:`)
          console.error(JSON.stringify(result.error.format(), null, 2))
        }
      } else {
        console.log(`⚠️ No album data for song ${id}`)
      }
    } catch (e) {
      console.error(`Error fetching song ${id}:`, e)
    }
    await new Promise((r) => setTimeout(r, 1000)) // Nice delay
  }
}

run()
