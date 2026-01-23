import { createHash } from 'crypto'
import { describe, expect, it, vi } from 'vitest'

const embedManyMock = vi.fn()

vi.mock('ai', () => ({
  embedMany: (...args: unknown[]) => embedManyMock(...args),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: vi.fn(() => ({ provider: 'mock', model: 'mock' })),
  },
}))

vi.mock('../lib/normalize', () => ({
  normalizeLyricsForEmbedding: (raw: string) => `normalized:${raw}`,
}))

import { EMBEDDING_DIMENSIONS } from './config'
import { generateEmbeddings } from './generate-embeddings'
import type { EmbeddingSong } from './types'

describe('embeddings/generate-embeddings', () => {
  it('should normalize lyrics and return embeddings with input hashes', async () => {
    // Arrange
    const embeddingA = new Array(EMBEDDING_DIMENSIONS).fill(0)
    const embeddingB = new Array(EMBEDDING_DIMENSIONS).fill(1)
    embedManyMock.mockResolvedValueOnce({
      embeddings: [embeddingA, embeddingB],
    })

    const songs: EmbeddingSong[] = [
      { id: 1, lyrics: 'a' },
      { id: 2, lyrics: 'b' },
    ]

    const sha256 = (s: string) =>
      createHash('sha256').update(s, 'utf8').digest('hex')

    // Act
    const result = await generateEmbeddings(songs)

    // Assert
    expect(embedManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['normalized:a', 'normalized:b'],
      }),
    )
    expect(result).toEqual([
      {
        id: 1,
        embedding: embeddingA,
        inputHash: sha256('normalized:a'),
      },
      {
        id: 2,
        embedding: embeddingB,
        inputHash: sha256('normalized:b'),
      },
    ])
  })
})
