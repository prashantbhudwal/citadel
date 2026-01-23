import { describe, expect, it } from 'vitest'

import { decodeVector, encodeVector } from './utils'

describe('embeddings/utils', () => {
  it('should round-trip float vectors (within tolerance)', () => {
    // Arrange
    const input = [0, 1, -1, 0.25, -0.5, 123.456]

    // Act
    const encoded = encodeVector(input)

    // Assert
    expect(encoded.byteLength).toBe(input.length * 4)

    const decoded = decodeVector(encoded)
    expect(decoded.length).toBe(input.length)

    for (let i = 0; i < input.length; i++) {
      expect(decoded[i]).toBeCloseTo(input[i]!, 4)
    }
  })
})
