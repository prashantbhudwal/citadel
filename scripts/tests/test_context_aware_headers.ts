import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/context_header_outliers.json',
)

async function testContextAwareHeaders() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let totalBracketLines = 0
  let passedContext = 0
  let failedContext = 0

  const outliers: Array<any> = []

  console.log('Testing Context-Aware Headers across all songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') continue

      // 1. Smart Start Logic
      const lyricsIndex = lyrics.indexOf('Lyrics')
      if (lyricsIndex === -1) continue

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
      const lines = cleanLyrics.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].trim()

        // Check if it's a bracket line
        if (currentLine.startsWith('[') && currentLine.endsWith(']')) {
          totalBracketLines++

          // Context Check
          // 1. Blank line before (or start of file)
          const prevLine = i > 0 ? lines[i - 1].trim() : ''
          const isStartOrBlankBefore = i === 0 || prevLine === ''

          // 2. Full line after (not empty)
          // Note: If it's the last line, nextLine is undefined/empty, so it fails "full line after"
          const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : ''
          const hasFullLineAfter = nextLine !== ''

          if (isStartOrBlankBefore && hasFullLineAfter) {
            passedContext++
          } else {
            failedContext++
            if (outliers.length < 100) {
              // Limit sample size
              outliers.push({
                songTitle: song.title,
                header: currentLine,
                context: {
                  prev: i > 0 ? lines[i - 1] : '[START]',
                  next: i < lines.length - 1 ? lines[i + 1] : '[END]',
                },
                reason: !isStartOrBlankBefore
                  ? 'No blank line before'
                  : 'No full line after',
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  const result = {
    totalBracketLines,
    passedContext,
    failedContext,
    passRate: ((passedContext / totalBracketLines) * 100).toFixed(2) + '%',
    outliers,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Bracket Lines: ${totalBracketLines}`)
  console.log(`Passed Context Check: ${passedContext} (${result.passRate})`)
  console.log(`Failed Context Check: ${failedContext}`)
  console.log(`\nDetailed outliers saved to ${OUTPUT_FILE}`)
}

testContextAwareHeaders().catch(console.error)
