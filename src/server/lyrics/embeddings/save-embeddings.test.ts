import { describe, expect, it, vi } from 'vitest'

const transactionMock = vi.fn()
const upsertMock = vi.fn()

vi.mock('@/server/prisma', () => ({
  db: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
    songEmbedding: {
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}))

import { saveEmbeddings } from './save-embeddings'

describe('embeddings/save-embeddings', () => {
  it('should upsert embeddings in a single transaction', async () => {
    // Arrange
    upsertMock.mockReturnValueOnce('op-1').mockReturnValueOnce('op-2')

    // Act
    await saveEmbeddings([
      { id: 1, embedding: [0, 1], inputHash: 'hash-1' },
      { id: 2, embedding: [2, 3], inputHash: 'hash-2' },
    ])

    // Assert
    expect(upsertMock).toHaveBeenCalledTimes(2)
    expect(upsertMock.mock.calls[0]?.[0]).toMatchObject({
      where: { songId_model_dimensions: { songId: 1 } },
      update: { inputHash: 'hash-1' },
      create: { songId: 1, inputHash: 'hash-1' },
    })
    expect(upsertMock.mock.calls[1]?.[0]).toMatchObject({
      where: { songId_model_dimensions: { songId: 2 } },
      update: { inputHash: 'hash-2' },
      create: { songId: 2, inputHash: 'hash-2' },
    })

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledWith(['op-1', 'op-2'])
  })
})
