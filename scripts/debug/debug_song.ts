import fs from 'node:fs/promises'
import ky from 'ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  // Rap God ID = 235729
  const url = 'https://www.genius.com/api/songs/235729'
  console.log('Fetching', url)
  try {
    const json: any = await ky
      .get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      })
      .json()

    await fs.writeFile(
      'src/song_debug_full.json',
      JSON.stringify(json, null, 2),
    )
    console.log('Wrote full song response to src/song_debug_full.json')

    // Also log the path to the album for the user
    if (json.response.song.album) {
      console.log('Album data found at: response.song.album')
      console.log('Album Name:', json.response.song.album.name)
    } else {
      console.log('Album data NOT found')
    }
  } catch (e) {
    console.error('Error', e)
  }
}

run()
