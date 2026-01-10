import fs from 'node:fs/promises'
import ky from 'ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  const url =
    'https://www.genius.com/api/artists/45/songs?page=1&per_page=1&sort=popularity&text_format=html,markdown'
  console.log('Fetching', url)
  try {
    const json = await ky
      .get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      })
      .json()
    await fs.writeFile('src/debug_output.json', JSON.stringify(json, null, 2))
    console.log('Wrote to src/debug_output.json')
  } catch (e) {
    console.error('Error', e)
  }
}

run()
