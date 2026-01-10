import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data/artists/45/lyric_splitters_refined.json',
)
const STATS_FILE = path.join(process.cwd(), 'data/artists/45/lyric_stats.json')

async function analyzeLyrics() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  const splitters = new Map<string, number>()
  // Only look for square brackets as they are the standard for Genius structure
  const regex = /\[[^\]]+\]/g

  // Keywords that strongly indicate a structural section
  const structuralKeywords = [
    'Intro',
    'Verse',
    'Chorus',
    'Outro',
    'Hook',
    'Bridge',
    'Pre-Chorus',
    'Interlude',
    'Refrain',
    'Skit',
    'Break',
    'Solo',
    'Instrumental',
    'Produced',
    'Part',
    'Spoken',
  ]

  console.log('Analyzing lyrics for structural markers...')

  let totalSongs = 0
  let songsWithMarkers = 0

  for await (const line of rl) {
    try {
      if (!line.trim()) continue
      const data = JSON.parse(line)
      totalSongs++
      const lyrics = data.lyrics

      if (typeof lyrics === 'string') {
        const lyricLines = lyrics.split('\n')
        for (const lyricLine of lyricLines) {
          const trimmedLine = lyricLine.trim()
          // Check if the line is strictly a bracketed section
          if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            songsWithMarkers++
            const count = splitters.get(trimmedLine) || 0
            splitters.set(trimmedLine, count + 1)
          }
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  // Categorize and Sort
  const sortedSplitters = Array.from(splitters.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([splitter, count]) => {
      const lower = splitter.toLowerCase()
      let type = 'Other'

      if (structuralKeywords.some((k) => lower.includes(k.toLowerCase()))) {
        type = 'Standard'
      } else if (!splitter.includes(' ')) {
        // Single word in brackets, likely an artist name if not a keyword
        type = 'Potential Artist'
      }

      return { splitter, count, type }
    })

  // Generate Stats
  const stats = {
    totalSongs,
    songsWithMarkers,
    totalUniqueSplitters: sortedSplitters.length,
    breakdown: {
      Standard: sortedSplitters.filter((s) => s.type === 'Standard').length,
      PotentialArtist: sortedSplitters.filter(
        (s) => s.type === 'Potential Artist',
      ).length,
      Other: sortedSplitters.filter((s) => s.type === 'Other').length,
    },
    topStandard: sortedSplitters
      .filter((s) => s.type === 'Standard')
      .slice(0, 20),
    topOther: sortedSplitters.filter((s) => s.type === 'Other').slice(0, 20),
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedSplitters, null, 2))
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2))

  console.log(`Analysis complete.`)
  console.log(`Total Songs: ${totalSongs}`)
  console.log(`Unique Splitters Found: ${sortedSplitters.length}`)
  console.log(`Stats saved to ${STATS_FILE}`)
  console.log(`Full list saved to ${OUTPUT_FILE}`)
}

analyzeLyrics().catch(console.error)
