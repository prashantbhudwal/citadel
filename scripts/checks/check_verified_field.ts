import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const SONG_LIST_FILE = path.join(
  process.cwd(),
  'data/artists/45/song_list.jsonl',
)

async function checkVerified() {
  const fileStream = fs.createReadStream(SONG_LIST_FILE)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let total = 0
  let topLevelVerified = 0
  let artistVerified = 0
  let otherVerified = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    const song = JSON.parse(line)
    total++

    if (song.is_verified === true) topLevelVerified++
    if (song.primary_artist && song.primary_artist.is_verified === true)
      artistVerified++

    // Check for other "verified" fields
    if (JSON.stringify(song).includes('"is_verified":true')) {
      otherVerified++
    }
  }

  console.log(`Total Songs: ${total}`)
  console.log(`Top-level 'is_verified': ${topLevelVerified}`)
  console.log(`Primary Artist 'is_verified': ${artistVerified}`)
  console.log(`Any 'is_verified':true in JSON: ${otherVerified}`)
}

checkVerified().catch(console.error)
