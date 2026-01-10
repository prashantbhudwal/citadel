import * as fs from 'node:fs'
import * as readline from 'node:readline'

interface Song {
  id: number
  title: string
  full_title: string
  primary_artist: { id: number; name: string }
  pyongs_count: number
  annotation_count: number
  release_date_for_display: string
  instrumental: boolean
}

const INPUT_FILE = 'data/artists/45/song_list.jsonl'
const TARGET_ARTIST_ID = 45

const IGNORE_KEYWORDS = [
  'remix',
  'instrumental',
  'acapella',
  'live',
  'skit',
  'speech',
  'interview',
  'freestyle',
  'edited',
  'clean',
  'radio edit',
  'video version',
  'demo',
  'snippet',
  'session',
]

function isUnwanted(song: Song): boolean {
  if (song.instrumental) return true
  const lower = song.title.toLowerCase()
  return IGNORE_KEYWORDS.some((k) => lower.includes(k))
}

function normalizeTitle(title: string): string {
  let s = title.toLowerCase()

  // Strategy: Strip all parenthesized content UNLESS it looks like a sequel/part marker
  // e.g. Keep (Part II), (Pt. 2), (Vol. 1)
  // Strip (feat. ...), (Live), (Regular Version)

  // We can do this by splitting by parens and re-assembling only the "kept" parts.
  // Or regex replace all parens that DO NOT match the keep list.

  // Regex:
  // \([^)]+\) matches ( ... )
  // We want to remove it IF it doesn't contain "part", "pt", "vol".

  s = s.replace(/\(([^)]+)\)/g, (match, content) => {
    if (/\b(part|pt|vol|chapter)\b/.test(content)) {
      return match // Keep it
    }
    return '' // Strip it
  })

  // Handle brackets too
  s = s.replace(/\[([^\]]+)\]/g, (match, content) => {
    if (/\b(part|pt|vol|chapter)\b/.test(content)) {
      return match
    }
    return ''
  })

  s = s.split(' - ')[0]
  return s.replace(/[^a-z0-9]/g, '')
}

async function run() {
  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })
  const songs: Array<Song> = []

  for await (const line of rl) {
    if (line.trim()) {
      try {
        songs.push(JSON.parse(line))
      } catch {}
    }
  }

  // 1. Strict Filter
  const filtered = songs.filter((s) => !isUnwanted(s))

  // 2. Group
  const groups = new Map<string, Array<Song>>()
  for (const s of filtered) {
    const key = normalizeTitle(s.title)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }

  // 3. Score and Select
  const kept: Array<Song> = []

  for (const [key, group] of groups) {
    if (group.length === 1) {
      kept.push(group[0])
      continue
    }

    // Scoring logic:
    // +1000 if primary_artist is Eminem
    // +points for pyongs
    // -100 for "clean" or "edit" if they slipped through
    const scored = group.map((s) => {
      let score = 0
      if (s.primary_artist.id === TARGET_ARTIST_ID) score += 10000
      // capped log of view count approx? Or just raw count
      score += s.pyongs_count || 0

      // Penalize very short or very long titles compared to group median?
      // Prefer Shorter title usually means original
      score -= s.title.length * 10

      return { s, score }
    })

    scored.sort((a, b) => b.score - a.score)
    kept.push(scored[0].s)
  }

  console.log(`Original: ${songs.length}`)
  console.log(`Filtered: ${filtered.length}`)
  console.log(`Unique: ${kept.length}`)

  // Verification check: "Love the Way You Lie"
  const ltwyl = kept.filter((s) =>
    s.title.toLowerCase().includes('love the way you lie'),
  )
  console.log('\nVerification - Love the Way You Lie vars:')
  ltwyl.forEach((s) => console.log(`- ${s.title} (ID: ${s.id})`))

  // Verification check: "Mockingbird"
  const mb = kept.filter((s) => s.title.toLowerCase().includes('mockingbird'))
  console.log('\nVerification - Mockingbird vars:')
  mb.forEach((s) => console.log(`- ${s.title} (ID: ${s.id})`))

  // Export Duplicates
  const duplicatesExport: Record<string, Array<any>> = {}
  let duplicateGroupCount = 0

  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicatesExport[key] = group
      duplicateGroupCount++
    }
  }

  const outputPath = 'duplicates.json'
  fs.writeFileSync(outputPath, JSON.stringify(duplicatesExport, null, 2))
  console.log(`\nFound ${duplicateGroupCount} groups with duplicates.`)
  console.log(`Detailed JSON report written to: ${outputPath}`)
}

run().catch(console.error)
