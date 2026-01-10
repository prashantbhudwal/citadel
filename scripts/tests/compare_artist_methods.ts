import fs from 'node:fs/promises'
import ky from 'ky'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function run() {
  const artistId = '45'
  const artistName = 'Eminem'

  const idUrl = `https://www.genius.com/api/artists/${artistId}?text_format=plain`
  const searchUrl = `https://www.genius.com/api/search?q=${encodeURIComponent(artistName)}`

  console.log('🚀 Comparing artist retrieval methods...')

  try {
    // 1. Fetch by ID
    console.log(`📡 Fetching by ID: ${idUrl}`)
    const idResponse = (await ky
      .get(idUrl, { headers: { 'User-Agent': USER_AGENT } })
      .json()) as any
    const idArtist = idResponse.response.artist

    // 2. Fetch by Name (Search)
    console.log(`📡 Searching by Name: ${searchUrl}`)
    const searchResponse = (await ky
      .get(searchUrl, { headers: { 'User-Agent': USER_AGENT } })
      .json()) as any

    // In /search, results are under 'hits' which are usually songs.
    // Let's also try /search/multi if available, or look for artist in hits.
    const searchHits = searchResponse.response.hits

    // Try search/multi for better artist results
    const multiSearchUrl = `https://www.genius.com/api/search/multi?q=${encodeURIComponent(artistName)}`
    console.log(`📡 Trying Multi-Search: ${multiSearchUrl}`)
    const multiSearchResponse = (await ky
      .get(multiSearchUrl, { headers: { 'User-Agent': USER_AGENT } })
      .json()) as any

    const results = {
      byId: idArtist,
      bySearch: searchHits,
      byMultiSearch: multiSearchResponse.response.sections,
    }

    const outputPath = 'plan/shaping/artist_comparison.json'
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2))

    console.log('✅ Comparison complete.')
    console.log('📝 Results written to:', outputPath)

    // Analysis
    console.log('\n--- Analysis ---')
    console.log('ID method returns a full Artist object with description.')

    const multiSections = multiSearchResponse.response.sections
    const artistSection = multiSections.find((s: any) => s.type === 'artist')
    if (artistSection && artistSection.hits.length > 0) {
      const searchArtist = artistSection.hits[0].result
      console.log(
        'Search method (multi) returns an Artist object but it might be a partial.',
      )
      console.log(
        `ID Name: ${idArtist.name} | Search Name: ${searchArtist.name}`,
      )
      console.log(`ID has description: ${!!idArtist.description}`)
      console.log(`Search has description: ${!!searchArtist.description}`)
    } else {
      console.log('No artist found in search sections.')
    }
  } catch (error) {
    console.error('❌ Error during comparison:', error)
  }
}

run()
