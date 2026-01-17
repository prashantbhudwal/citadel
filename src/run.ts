import { updateAllSongHashes } from './server/lyrics/db/backfill-songs-hashes'

export async function run() {
  await updateAllSongHashes()
}

run()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
