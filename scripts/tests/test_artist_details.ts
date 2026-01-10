import fs from 'node:fs/promises'
import ky from 'ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  const artistId = '45'
  const url = `https://www.genius.com/api/artists/${artistId}?text_format=plain,markdown`

  console.log('🚀 Fetching artist details (plain & markdown) from:', url)

  try {
    const response = await ky.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const json = (await response.json()) as any

    const outputPath = 'plan/shaping/artist_45_debug.json'
    await fs.writeFile(outputPath, JSON.stringify(json, null, 2))

    console.log('✅ Successfully fetched artist details.')
    console.log('📝 Results written to:', outputPath)

    // Quick summary of results
    if (json.response && json.response.artist) {
      const artist = json.response.artist
      console.log('\n--- Artist Summary ---')
      console.log(`Name: ${artist.name}`)
      console.log(`URL: ${artist.url}`)
      console.log(`ID: ${artist.id}`)
      console.log(`Header Image: ${artist.header_image_url}`)
      console.log('----------------------\n')
    }
  } catch (error) {
    console.error('❌ Error fetching artist details:', error)
  }
}

run()
