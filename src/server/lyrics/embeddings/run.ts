import { EmbeddingSong } from './types'
import { getSongsForEmbeddingsRelaxed } from './get-songs-for-embeddings'
import { generateEmbeddings } from './generate-embeddings'
import { saveEmbeddings } from './save-embeddings'
import { TARGET_ARTIST_ID } from './config'

const BATCH_SIZE = 50

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function runEmbeddings() {
  const startTime = Date.now()
  console.log('Fetching songs that need embeddings (relaxed filters)...')

  const songs = await getSongsForEmbeddingsRelaxed({
    targetArtistId: TARGET_ARTIST_ID,
  })

  console.log(`Found ${songs.length} songs to embed.`)

  if (songs.length === 0) {
    console.log('No songs need embedding. Done.')
    return
  }

  const batches = chunk(songs, BATCH_SIZE)
  let successCount = 0
  let errorCount = 0

  console.log(
    `Processing ${batches.length} batches of up to ${BATCH_SIZE} songs each...\n`,
  )

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!
    console.log(`Batch ${i + 1}/${batches.length}: ${batch.length} songs...`)

    try {
      const results = await generateEmbeddings(batch)
      await saveEmbeddings(results)
      successCount++
      console.log(`  ✅ Saved ${results.length} embeddings`)
    } catch (err) {
      errorCount++
      console.error(`  ❌ Error:`, err)
    }
  }

  const elapsedMs = Date.now() - startTime
  const elapsedSec = (elapsedMs / 1000).toFixed(2)

  console.log('\n📊 --- Embedding Pipeline Stats ---')
  console.log(`Total songs queued:     ${songs.length}`)
  console.log(`Batches processed:      ${successCount}`)
  console.log(`Errors encountered:     ${errorCount}`)
  console.log(`Total time:             ${elapsedSec}s`)
  console.log(
    `Avg per song:           ${(elapsedMs / songs.length).toFixed(0)}ms`,
  )
  console.log('-----------------------------------\n')
}

// CLI entrypoint
runEmbeddings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Pipeline failed:', err)
    process.exit(1)
  })
