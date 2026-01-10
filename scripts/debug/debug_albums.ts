import ky from 'ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  // Eminem ID = 45
  const url = 'https://www.genius.com/api/artists/45/albums'
  console.log('Fetching', url)
  try {
    const json: any = await ky
      .get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      })
      .json()
    console.log('Albums found:', json.response.albums?.length || 0)
    console.log('First album:', json.response.albums?.[0]?.name)
  } catch (e: any) {
    console.error('Error fetching albums:', e.message)
    if (e.response) {
      console.error('Status:', e.response.status)
    }
  }
}

run()
