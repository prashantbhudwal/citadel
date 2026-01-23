import { createHash } from 'crypto'

export function computeInputHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

// Encode number[] -> SQLite Bytes (Float32, little-endian)
export function encodeVector(embedding: number[]) {
  const buffer = new ArrayBuffer(embedding.length * 4)
  const view = new DataView(buffer)
  for (let i = 0; i < embedding.length; i++) {
    view.setFloat32(i * 4, embedding[i]!, true) // little-endian
  }
  return Buffer.from(new Uint8Array(buffer))
}

// Decode Bytes -> Float32Array (useful for offline analysis)
export function decodeVector(buffer: Uint8Array): Float32Array {
  if (buffer.byteLength % 4 !== 0) {
    throw new Error(
      `Invalid vector byte length: ${buffer.byteLength} (not divisible by 4)`,
    )
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const floats = new Float32Array(buffer.byteLength / 4)

  for (let i = 0; i < floats.length; i++) {
    floats[i] = view.getFloat32(i * 4, true) // little-endian
  }
  return floats
}
