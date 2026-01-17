import { db } from '@/server/prisma'
import { asyncBatch, AsyncBatcherOptions } from '@tanstack/pacer'

export type BatchSong = {
  id: number
  lyrics: string | null
  title?: string
  _count?: { featuredArtists: number; primaryArtists: number }
}

const BATCH_OPTIONS: Partial<AsyncBatcherOptions<BatchSong>> = {
  maxSize: 100,
  wait: 50,
  asyncRetryerOptions: {
    maxAttempts: 3,
    backoff: 'exponential',
    baseWait: 1000,
  },
  onError: (error) => {
    console.error(`Error in this batch: ${error}`)
  },
}

type BatchingFunction = {
  processingFn: ({
    song,
  }: {
    song: BatchSong
  }) =>
    | ReturnType<typeof db.songAnalysis.upsert>
    | ReturnType<typeof db.song.update>
}

export function createSongBatchProcessor({ processingFn }: BatchingFunction) {
  const batcher = asyncBatch<BatchSong>(
    (songs) => db.$transaction(songs.map((song) => processingFn({ song }))),
    BATCH_OPTIONS,
  )

  const processBatch = async (songs: BatchSong[]) => {
    const promises = songs.map((song) => batcher(song))
    await Promise.all(promises)
  }

  return processBatch
}
