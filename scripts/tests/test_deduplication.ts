import * as fs from 'node:fs'
import * as readline from 'node:readline'

interface Song {
  id: number
  title: string
  full_title: string
  title_with_featured: string
  url: string
  primary_artist: { id: number; name: string }
  primary_artist_names: string
  featured_artists: Array<{ id: number; name: string }>
  instrumental: boolean
  pyongs_count: number
  release_date_for_display: string
  annotation_count: number
  stats: {
    pageviews?: number
    concurrents?: number
  }
}

const INPUT_FILE = 'data/artists/45/song_list.jsonl'

// Keywords that indicate a song should be completely ignored
const IGNORE_KEYWORDS = [
  'remix',
  'instrumental',
  'acapella',
  'live',
  'skit',
  'speech',
  'interview',
  'freestyle', // User might want freestyles? But often they are non-songs. Retaining for now if user didn't explicitly ban.
  'edited',
  'clean version',
  'radio edit',
  'video version',
  'demo',
  'snippet',
  'session',
]

function isUnwanted(song: Song): boolean {
  const lowerTitle = song.title.toLowerCase()

  if (song.instrumental) return true

  // Check strict keywords
  for (const keyword of IGNORE_KEYWORDS) {
    if (lowerTitle.includes(keyword)) return true
  }

  return false
}

function normalizeTitle(title: string): string {
  let s = title.toLowerCase()
  // Remove content in round brackets
  s = s.replace(/\([^)]*\)/g, '')
  // Remove content in square brackets
  s = s.replace(/\[[^\]]*\]/g, '')
  // Remove everything after " - "
  s = s.split(' - ')[0]
  // Remove non-alphanumeric (except spaces)
  s = s.replace(/[^a-z0-9 ]/g, '')
  return s.trim().replace(/\s+/g, ' ')
}

async function deduplicateSongs() {
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
      } catch (e) {
        // ignore errors
      }
    }
  }

  console.log(`Initial total songs: ${songs.length}`)

  // 1. Filter phase
  const filteredParams = songs.filter((s) => !isUnwanted(s))
  console.log(
    `Songs after removing unwanted (remix, live, etc.): ${filteredParams.length}`,
  )

  // 2. Grouping phase
  const groups = new Map<string, Array<Song>>()

  for (const song of filteredParams) {
    const key = normalizeTitle(song.title)
    if (!key) continue // Empty title?

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(song)
  }

  // 3. ANALYSIS phase
  console.log('\n--- DETAILED DUPLICATE ANALYSIS ---\n')

  // Let's sample the top 20 most populated groups, and also some random ones
  const sortedGroups = Array.from(groups.entries())
    .filter(([_, g]) => g.length > 1)
    .sort((a, b) => b[1].length - a[1].length) // Sort by group size

  for (const [key, group] of sortedGroups.slice(0, 20)) {
    console.log(`\nGROUP: "${key}" (${group.length} variations)`)
    console.table(
      group.map((s) => ({
        id: s.id,
        title: s.title,
        full_title: s.full_title,
        artist: s.primary_artist.name,
        pyongs: s.pyongs_count,
        dates: s.release_date_for_display,
        annotations: s.annotation_count,
        url: s.url,
      })),
    )
  }
}

deduplicateSongs().catch(console.error)
