import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/filtered_parsing_results.json',
)

const SONG_LIST_FILE = path.join(
  process.cwd(),
  'data/artists/45/song_list.jsonl',
)

async function getVerifiedSongIds(): Promise<Set<number>> {
  const verifiedIds = new Set<number>()
  if (!fs.existsSync(SONG_LIST_FILE)) return verifiedIds

  const fileStream = fs.createReadStream(SONG_LIST_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const song = JSON.parse(line)
      // Check if primary artist is verified
      if (song.primary_artist && song.primary_artist.is_verified) {
        verifiedIds.add(song.id)
      }
    } catch (e) {}
  }
  return verifiedIds
}

async function testFilteredParsing() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const verifiedSongIds = await getVerifiedSongIds()
  console.log(
    `Loaded ${verifiedSongIds.size} verified songs from song_list.jsonl`,
  )

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let totalSoloSongs = 0
  let filteredSongs = 0
  let songsToParse = 0
  let successfulParses = 0
  let unstructuredSongs = 0

  const outliers: Array<any> = []
  const filteredSamples: Array<any> = []

  console.log('Testing Filtered Parsing Strategy on Solo Eminem Songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)

      // 1. Filter for Solo Eminem Songs
      const isSolo =
        (!song.featured_artists || song.featured_artists.length === 0) &&
        song.artist_names === 'Eminem'

      if (!isSolo) continue

      totalSoloSongs++
      const titleLower = song.title.toLowerCase()
      const lyrics = song.lyrics || ''
      const lyricsLower = lyrics.toLowerCase()

      // 2. Apply Exclusion Filters
      const isInterview = titleLower.includes('interview')
      const isInstrumental =
        titleLower.includes('instrumental') ||
        lyricsLower.includes('this song is an instrumental')
      const isCleanVersion = titleLower.includes('clean version') // Specific phrase
      const isFreestyle = titleLower.includes('freestyle')
      const isSkit = titleLower.includes('skit')
      const isPlaceholder = lyricsLower.includes('yet to be transcribed')

      // New Filter: Is Verified
      const isVerified = verifiedSongIds.has(song.id)

      if (
        isInterview ||
        isInstrumental ||
        isCleanVersion ||
        isFreestyle ||
        isSkit ||
        isPlaceholder ||
        !isVerified
      ) {
        filteredSongs++
        if (filteredSamples.length < 20) {
          let reason = 'Filtered'
          if (!isVerified) reason = 'Unverified'
          else if (isInterview) reason = 'Interview'
          else if (isInstrumental) reason = 'Instrumental'
          else if (isFreestyle) reason = 'Freestyle'
          else if (isSkit) reason = 'Skit'

          filteredSamples.push({ title: song.title, reason })
        }
        continue
      }

      songsToParse++

      // 3. Run Hybrid Parsing Strategy

      // Smart Start
      const lyricsIndex = lyrics.indexOf('Lyrics')
      if (lyricsIndex === -1) {
        // Should be filtered out or rare
        continue
      }

      const textToSearch = lyrics.substring(lyricsIndex + 6)
      let searchOffset = 0

      const readMoreIndex = textToSearch.indexOf('Read More')
      if (readMoreIndex !== -1) {
        searchOffset = readMoreIndex + 9
      }

      const bracketIndex = textToSearch.indexOf('[', searchOffset)
      const parenIndex = textToSearch.indexOf('(', searchOffset)

      let startIndex = -1
      if (bracketIndex !== -1 && parenIndex !== -1) {
        startIndex = Math.min(bracketIndex, parenIndex)
      } else if (bracketIndex !== -1) {
        startIndex = bracketIndex
      } else if (parenIndex !== -1) {
        startIndex = parenIndex
      }

      // Fallback: Implicit start
      if (startIndex === -1) {
        startIndex = searchOffset
      }

      const cleanLyrics = textToSearch.substring(startIndex)

      if (!cleanLyrics.trim()) {
        // Empty content after filtering? Treat as unstructured/failed
        unstructuredSongs++
        const { lyrics: _, ...metadata } = song
        outliers.push({
          ...metadata,
          reason: 'Empty content after start heuristic',
          originalSnippet: textToSearch.substring(0, 100),
        })
        continue
      }

      // Header-Driven Parsing
      const lines = cleanLyrics.split('\n')
      let foundHeader = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Strict Header Check
        if (
          (line.startsWith('[') && line.endsWith(']')) ||
          (line.startsWith('(') && line.endsWith(')'))
        ) {
          foundHeader = true
          break // Found at least one header, count as success
        }
      }

      if (foundHeader) {
        successfulParses++
      } else {
        unstructuredSongs++
        if (outliers.length < 100) {
          const { lyrics: _, ...metadata } = song
          outliers.push({
            ...metadata,
            reason: 'Unstructured (No headers found)',
            fullTextSnippet: cleanLyrics.substring(0, 200).replace(/\n/g, ' '),
          })
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  const result = {
    totalSoloSongs,
    filteredSongs,
    songsToParse,
    stats: {
      structured: successfulParses,
      unstructured: unstructuredSongs,
      successRate:
        songsToParse > 0
          ? ((successfulParses / songsToParse) * 100).toFixed(2) + '%'
          : '0%',
    },
    filteredSamples,
    outliers,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Solo Songs: ${totalSoloSongs}`)
  console.log(`Filtered Out (Noise): ${filteredSongs}`)
  console.log(`Songs to Parse: ${songsToParse}`)
  console.log(
    `Structured (Found Headers): ${successfulParses} (${result.stats.successRate})`,
  )
  console.log(`Unstructured (No Headers): ${unstructuredSongs}`)
  console.log(`\nDetailed results saved to ${OUTPUT_FILE}`)
}

testFilteredParsing().catch(console.error)
