const artists = [{ name: 'eminem', id: '45' }]

async function getSongsByArtistId(artistId: string) {
  const params = new URLSearchParams({
    page: String(1),
    per_page: '50',
    sort: 'popularity',
    text_format: 'html,markdown',
  })

  const response = await fetch(
    `https://genius.com/api/artists/${artistId}/songs?${params.toString()}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    },
  )
  const data = await response.json()
  return data
}

export async function getLyrics() {
  const songs = await getSongsByArtistId(artists[0].id)

  return songs
}
