export type EmbeddingSong = {
  id: number
  lyrics: string
}

export type EmbeddingResult = {
  id: number
  inputHash: string
  embedding: number[]
}
