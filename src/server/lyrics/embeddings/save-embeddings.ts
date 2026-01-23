import { db } from '@/server/prisma'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './config'
import { EmbeddingResult } from './types'
import { encodeVector } from './utils'

export async function saveEmbeddings(
  results: EmbeddingResult[],
): Promise<void> {
  if (results.length === 0) return
  await db.$transaction(
    results.map((result) => {
      const vectorBytes = encodeVector(result.embedding)

      return db.songEmbedding.upsert({
        where: {
          songId_model_dimensions: {
            songId: result.id,
            model: EMBEDDING_MODEL,
            dimensions: EMBEDDING_DIMENSIONS,
          },
        },
        update: {
          vector: vectorBytes,
          inputHash: result.inputHash,
        },
        create: {
          songId: result.id,
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
          vector: vectorBytes,
          inputHash: result.inputHash,
        },
      })
    }),
  )
}
