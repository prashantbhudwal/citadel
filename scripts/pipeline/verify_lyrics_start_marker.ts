import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const INPUT_FILE = path.join(process.cwd(), 'data/artists/45/lyrics.jsonl')

async function verifyLyricsMarker() {
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
  let hasLyricsMarker = 0
  let noLyricsMarker = 0
  const exceptions: Array<any> = []

  console.log('Verifying "Lyrics" marker in the first line of lyrics...\n')

  for await (const line of rl) {
    if (!line.trim()) continue

    try {
      const song = JSON.parse(line)
      totalSongs++
      const lyrics = song.lyrics

      if (typeof lyrics !== 'string') {
        console.log(`[WARN] Song "${song.title}" has no lyrics string.`)
        noLyricsMarker++
        continue
      }

      // Get the first line (or a reasonable chunk of the start if it's one long line)
      // The user specifically asked about the "first line", but sometimes the file content might be formatted differently.
      // We'll look at the first line up to the first newline.
      const firstNewlineIndex = lyrics.indexOf('\n')
      const firstLine =
        firstNewlineIndex !== -1
          ? lyrics.substring(0, firstNewlineIndex)
          : lyrics

      if (firstLine.includes('Lyrics')) {
        hasLyricsMarker++
      } else {
        noLyricsMarker++
        if (exceptions.length < 10) {
          exceptions.push({
            title: song.title,
            firstLine: firstLine.substring(0, 100), // Truncate for display
          })
        }
      }
    } catch (error) {
      console.error('Error parsing line:', error)
    }
  }

  console.log('--- Summary ---')
  console.log(`Total Songs Analyzed: ${totalSongs}`)
  console.log(
    `Songs with "Lyrics" in first line: ${hasLyricsMarker} (${((hasLyricsMarker / totalSongs) * 100).toFixed(1)}%)`,
  )
  console.log(
    `Songs WITHOUT "Lyrics" in first line: ${noLyricsMarker} (${((noLyricsMarker / totalSongs) * 100).toFixed(1)}%)`,
  )

  if (exceptions.length > 0) {
    console.log('\n--- Examples of Exceptions (First 10) ---')
    exceptions.forEach((ex) => {
      console.log(`Song: "${ex.title}"`)
      console.log(`First Line: "${ex.firstLine}"`)
      console.log('---')
    })
  }
}

verifyLyricsMarker().catch(console.error)
