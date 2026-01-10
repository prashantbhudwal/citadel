import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/header_split_results.json',
)

async function testHeaderDrivenSplit() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let totalSongs = 0
  let successfulSplits = 0
  let failedSplits = 0

  const outliers: Array<any> = []

  console.log('Testing Header-Driven Splitting across all songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)
      totalSongs++
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') {
        continue
      }

      // 1. Smart Start Logic (Proven)
      const lyricsIndex = lyrics.indexOf('Lyrics')
      if (lyricsIndex === -1) {
        // Should not happen based on previous tests, but handle it
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

      // 2. Header-Driven Splitting
      const lines = cleanLyrics.split('\n')
      const sections: Array<{ label: string; content: Array<string> }> = []
      let currentLabel = 'Unknown/Intro'
      let currentContent: Array<string> = []

      // If the very first line is a header, we start with that.
      // If not, we accumulate into "Unknown/Intro" until we hit a header.

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Check if line is a header
        // Strict header: Starts with [ and ends with ]
        // We can also allow ( and ) if we want to be looser, but let's stick to [ ] for structure as per findings
        if (line.startsWith('[') && line.endsWith(']')) {
          // Save previous section if it has content
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

      // 3. Evaluate Success
      // A "successful" split means we found at least one section with a standard label (starts with [)
      // AND we didn't end up with a huge "Unknown" chunk that looks like the whole song.

      const hasStandardLabel = sections.some((s) => s.label.startsWith('['))

      if (hasStandardLabel) {
        successfulSplits++
      } else {
        failedSplits++
        if (outliers.length < 50) {
          outliers.push({
            title: song.title,
            reason: 'No standard headers found',
            sectionsCount: sections.length,
            firstSectionSnippet: sections[0]?.content.slice(0, 5).join('\n'),
          })
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  const result = {
    totalSongs,
    successfulSplits,
    failedSplits,
    successRate: ((successfulSplits / totalSongs) * 100).toFixed(2) + '%',
    outliers,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Songs: ${totalSongs}`)
  console.log(
    `Successful Header Splits: ${successfulSplits} (${result.successRate})`,
  )
  console.log(`Failed Splits (No Headers): ${failedSplits}`)
  console.log(`\nDetailed outliers saved to ${OUTPUT_FILE}`)
}

testHeaderDrivenSplit().catch(console.error)
