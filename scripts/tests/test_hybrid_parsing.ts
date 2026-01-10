import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/hybrid_parsing_results.json',
)

async function testHybridParsing() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let totalSoloSongs = 0
  let successfulParses = 0 // Found at least one header
  let unstructuredSongs = 0 // Found content but no headers
  let emptyContentSongs = 0 // Found no content

  const outliers: Array<any> = []

  console.log('Testing Hybrid Parsing Strategy on Solo Eminem Songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)

      // Filter for Solo Eminem Songs
      // Logic: No featured artists AND artist name is exactly Eminem
      const isSolo =
        (!song.featured_artists || song.featured_artists.length === 0) &&
        song.artist_names === 'Eminem'

      if (!isSolo) continue

      totalSoloSongs++
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') {
        emptyContentSongs++
        continue
      }

      // --- Step 1: Smart Start (Lyrics -> Read More -> Marker/Implicit) ---
      const lyricsIndex = lyrics.indexOf('Lyrics')
      if (lyricsIndex === -1) {
        // Should be rare/impossible based on previous checks
        outliers.push({
          title: song.title,
          reason: 'Missing "Lyrics" keyword',
          snippet: lyrics.substring(0, 100),
        })
        continue
      }

      const textToSearch = lyrics.substring(lyricsIndex + 6)
      let searchOffset = 0

      const readMoreIndex = textToSearch.indexOf('Read More')
      if (readMoreIndex !== -1) {
        searchOffset = readMoreIndex + 9
      }

      // Look for first marker AFTER the offset
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
        emptyContentSongs++
        outliers.push({
          title: song.title,
          reason: 'Empty content after start heuristic',
          originalSnippet: textToSearch.substring(0, 100),
        })
        continue
      }

      // --- Step 2: Header-Driven Parsing ---
      const lines = cleanLyrics.split('\n')
      const sections: Array<{ label: string; content: Array<string> }> = []
      let currentLabel = 'Unknown/Intro' // Default label if text starts immediately
      let currentContent: Array<string> = []
      let foundHeader = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Strict Header Check: Starts with [ or ( AND ends with ] or )
        // User requested: line == []|()
        const isBracketHeader = line.startsWith('[') && line.endsWith(']')
        const isParenHeader = line.startsWith('(') && line.endsWith(')')

        if (isBracketHeader || isParenHeader) {
          foundHeader = true
          // Save previous section
          if (currentContent.length > 0 || currentLabel !== 'Unknown/Intro') {
            sections.push({
              label: currentLabel,
              content: currentContent,
            })
          }

          // Start new section
          currentLabel = line
          currentContent = []
        } else {
          // Accumulate content
          currentContent.push(line)
        }
      }

      // Push the last section
      if (currentContent.length > 0 || currentLabel !== 'Unknown/Intro') {
        sections.push({
          label: currentLabel,
          content: currentContent,
        })
      }

      // --- Step 3: Classification ---
      if (foundHeader) {
        successfulParses++
      } else {
        unstructuredSongs++
        // These are "outliers" in the sense that they don't have structure
        if (outliers.length < 100) {
          outliers.push({
            title: song.title,
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
    stats: {
      structured: successfulParses,
      unstructured: unstructuredSongs,
      empty: emptyContentSongs,
      successRate: ((successfulParses / totalSoloSongs) * 100).toFixed(2) + '%',
    },
    outliers,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Solo Songs: ${totalSoloSongs}`)
  console.log(
    `Structured (Found Headers): ${successfulParses} (${result.stats.successRate})`,
  )
  console.log(`Unstructured (No Headers): ${unstructuredSongs}`)
  console.log(`Empty/Failed: ${emptyContentSongs}`)
  console.log(`\nDetailed outliers saved to ${OUTPUT_FILE}`)
}

testHybridParsing().catch(console.error)
