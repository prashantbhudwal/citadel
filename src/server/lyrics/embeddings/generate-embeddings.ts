import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { normalizeLyricsForEmbedding } from '../lib/normalize'
import { EmbeddingResult, EmbeddingSong } from './types'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './config'
import { computeInputHash } from './utils'

const MAX_RETRIES = 3

export async function generateEmbeddings(
  songs: EmbeddingSong[],
): Promise<EmbeddingResult[]> {
  const normalizedSongs = songs.map((song) => ({
    id: song.id,
    lyrics: normalizeLyricsForEmbedding(song.lyrics),
  }))

  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: normalizedSongs.map((song) => song.lyrics),
    maxRetries: MAX_RETRIES,
    experimental_telemetry: { isEnabled: false },
    providerOptions: {
      openai: {
        dimensions: EMBEDDING_DIMENSIONS,
      },
    },
  })

  if (embeddings.length !== normalizedSongs.length) {
    throw new Error(
      `embedMany returned ${embeddings.length} embeddings for ${normalizedSongs.length} inputs`,
    )
  }

  for (let i = 0; i < embeddings.length; i++) {
    const e = embeddings[i]
    if (!Array.isArray(e)) {
      throw new Error(`Embedding at index ${i} is not an array`)
    }
    if (e.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding at index ${i} has length ${e.length}, expected ${EMBEDDING_DIMENSIONS}`,
      )
    }
  }
  return normalizedSongs.map((normalizedSong, index) => ({
    id: normalizedSong.id,
    embedding: embeddings[index],
    inputHash: computeInputHash(normalizedSong.lyrics),
  }))
}
