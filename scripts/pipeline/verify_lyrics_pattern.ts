import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')

async function verifyPatterns() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`)
    process.exit(1)
  }

  const fileStream = fs.createReadStream(INPUT_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  const songs: Array<any> = []
  for await (const line of rl) {
    if (line.trim()) {
      const song = JSON.parse(line)
      // Filter for solo Eminem songs: No featured artists and artist name is exactly 'Eminem'
      if (
        song.featured_artists &&
        song.featured_artists.length === 0 &&
        song.artist_names === 'Eminem'
      ) {
        songs.push(song)
      }
    }
  }

  console.log(`Found ${songs.length} solo Eminem songs.`)

  // Pick 20 random songs
  const sampleSize = 20
  const sampleSongs = []
  if (songs.length < sampleSize) {
    console.log(`Only found ${songs.length} solo songs, analyzing all of them.`)
    sampleSongs.push(...songs)
  } else {
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * songs.length)
      sampleSongs.push(songs[randomIndex])
    }
  }

  console.log(`Analyzing ${sampleSongs.length} random solo songs...\n`)

  let totalBlocks = 0
  let blocksWithLabel = 0
  let blocksWithoutLabel = 0
  const outliers: Array<any> = []

  for (const song of sampleSongs) {
    let lyrics = song.lyrics

    if (typeof lyrics !== 'string') {
      continue
    }

    // Strip metadata up to "Lyrics"
    const lyricsIndex = lyrics.indexOf('Lyrics')
    if (lyricsIndex !== -1) {
      // Cut off everything before and including "Lyrics"
      lyrics = lyrics.substring(lyricsIndex + 6)
    }

    // Split by double newline
    const blocks = lyrics.split('\n\n')

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim()
      if (!block) continue

      totalBlocks++
      const lines = block.split('\n')
      const firstLine = lines[0].trim()

      const isLabel =
        (firstLine.startsWith('[') && firstLine.endsWith(']')) ||
        (firstLine.startsWith('(') && firstLine.endsWith(')'))

      if (isLabel) {
        blocksWithLabel++
      } else {
        blocksWithoutLabel++
        outliers.push({
          songTitle: song.title,
          blockIndex: i,
          firstLine: firstLine,
          fullBlockSnippet: block.substring(0, 200),
        })
      }
    }
  }

  console.log('--- Summary ---')
  console.log(`Total Blocks Analyzed: ${totalBlocks}`)
  console.log(
    `Blocks starting with Label: ${blocksWithLabel} (${((blocksWithLabel / totalBlocks) * 100).toFixed(1)}%)`,
  )
  console.log(
    `Blocks NOT starting with Label: ${blocksWithoutLabel} (${((blocksWithoutLabel / totalBlocks) * 100).toFixed(1)}%)`,
  )

  const OUTLIERS_FILE = path.join(
    process.cwd(),
    'data/artists/45/lyric_outliers_solo.json',
  )
  fs.writeFileSync(OUTLIERS_FILE, JSON.stringify(outliers, null, 2))
  console.log(`\nOutliers saved to ${OUTLIERS_FILE}`)
}

verifyPatterns().catch(console.error)
