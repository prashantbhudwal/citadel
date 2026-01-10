import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/strict_pattern_outliers.json',
)

async function verifyStrictPatterns() {
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
  let startPatternFailures = 0
  let blockPatternFailures = 0

  const startOutliers: Array<any> = []
  const blockOutliers: Array<any> = []

  console.log('Verifying strict patterns across all songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)
      totalSongs++
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') {
        continue
      }

      // --- Smart Start Logic ---
      const lyricsIndex = lyrics.indexOf('Lyrics')

      if (lyricsIndex === -1) {
        startPatternFailures++
        startOutliers.push({
          type: 'Missing "Lyrics" keyword',
          ...song, // Include full song object with lyrics
          snippet: lyrics.substring(0, 100),
        })
        continue
      }

      const textToSearch = lyrics.substring(lyricsIndex + 6)
      let searchOffset = 0

      // Check for "Read More"
      const readMoreIndex = textToSearch.indexOf('Read More')
      if (readMoreIndex !== -1) {
        // If "Read More" is found, we only look for the start marker AFTER it
        searchOffset = readMoreIndex + 9 // Length of "Read More"
      }

      // Find the first '[' or '(' after the offset
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

      if (startIndex === -1) {
        // No start marker found.
        // New Rule: Assume the song started anyway (implicit start without label).
        startIndex = searchOffset

        // Check if there is actually content
        if (startIndex >= textToSearch.length) {
          startPatternFailures++
          if (startOutliers.length < 50) {
            startOutliers.push({
              type: 'Empty content after heuristic',
              ...song,
              snippetAfterLyrics: textToSearch.substring(0, 200),
            })
          }
          continue
        }
      }

      // The lyrics content starts from the found marker
      const lyricsContent = textToSearch.substring(startIndex)

      // --- Check 2: Block Pattern ---
      // Split the lyrics content by \n\n and check if each block starts with [ or (
      const blocks = lyricsContent.split('\n\n')

      let songHasBlockFailure = false
      const failedBlocks = []

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim()
        if (!block) continue

        if (!block.startsWith('[') && !block.startsWith('(')) {
          songHasBlockFailure = true
          if (failedBlocks.length < 5) {
            failedBlocks.push({
              index: i,
              snippet: block.substring(0, 100),
            })
          }
        }
      }

      if (songHasBlockFailure) {
        blockPatternFailures++
        if (blockOutliers.length < 50) {
          blockOutliers.push({
            ...song, // Include full song object with lyrics
            failedBlocks: failedBlocks,
          })
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  const result = {
    totalSongs,
    startPatternStats: {
      failures: startPatternFailures,
      failureRate: ((startPatternFailures / totalSongs) * 100).toFixed(2) + '%',
    },
    blockPatternStats: {
      failures: blockPatternFailures,
      failureRate: ((blockPatternFailures / totalSongs) * 100).toFixed(2) + '%',
    },
    startOutliers: startOutliers, // Capped at 50
    blockOutliers: blockOutliers, // Capped at 50
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Songs: ${totalSongs}`)
  console.log(
    `Start Pattern Failures: ${startPatternFailures} (${result.startPatternStats.failureRate})`,
  )
  console.log(
    `Block Pattern Failures: ${blockPatternFailures} (${result.blockPatternStats.failureRate})`,
  )
  console.log(`\nDetailed outliers saved to ${OUTPUT_FILE}`)
}

verifyStrictPatterns().catch(console.error)
