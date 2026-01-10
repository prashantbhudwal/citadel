import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/bracket_analysis.json',
)

const STRUCTURAL_KEYWORDS = [
  'verse',
  'chorus',
  'intro',
  'outro',
  'hook',
  'bridge',
  'pre-chorus',
  'interlude',
  'refrain',
  'break',
]

async function verifyBracketContent() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  const bracketLines = new Map<string, number>()
  const suspiciousBrackets: Array<string> = []
  const inlineBrackets: Array<string> = []

  console.log('Analyzing bracket content across all songs...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') continue

      const lyricLines = lyrics.split('\n')

      for (const lyricLine of lyricLines) {
        const trimmed = lyricLine.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          // It's a full-line bracket
          const content = trimmed.toLowerCase()
          bracketLines.set(trimmed, (bracketLines.get(trimmed) || 0) + 1)

          // Check if it contains any structural keyword
          const isStructural = STRUCTURAL_KEYWORDS.some((k) =>
            content.includes(k),
          )

          if (!isStructural) {
            // It's a bracket line, but doesn't look like a standard header
            // e.g. [scratches], [gunshot], [?]
            if (!suspiciousBrackets.includes(trimmed)) {
              suspiciousBrackets.push(trimmed)
            }
          }
        } else if (trimmed.includes('[') || trimmed.includes(']')) {
          // Inline bracket or partial bracket
          if (!inlineBrackets.includes(trimmed)) {
            inlineBrackets.push(trimmed)
          }
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  // Sort suspicious brackets by frequency/name
  suspiciousBrackets.sort()

  const result = {
    totalUniqueBracketLines: bracketLines.size,
    suspiciousBracketsCount: suspiciousBrackets.length,
    suspiciousBracketsSample: suspiciousBrackets.slice(0, 100), // Show top 100
    inlineBracketsSample: inlineBrackets.slice(0, 50),
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))

  console.log('--- Summary ---')
  console.log(`Total Unique Bracket Lines: ${bracketLines.size}`)
  console.log(
    `Suspicious (Non-Structural) Brackets: ${suspiciousBrackets.length}`,
  )
  console.log(`\nDetailed analysis saved to ${OUTPUT_FILE}`)
}

verifyBracketContent().catch(console.error)
