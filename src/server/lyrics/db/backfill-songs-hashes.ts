import { db } from '@/server/prisma'
import { getLyricsHash } from '../lib/get-lyrics-hash'
import { asyncBatch } from '@tanstack/pacer'

export function hashSongAndUpdate(songId: number, lyrics: string) {
  const hash = getLyricsHash(lyrics)
  return db.song.update({
    where: { id: songId },
    data: { lyricsHash: hash },
  })
}

const batchSongsUpdate = asyncBatch<{ id: number; lyrics: string }>(
  async (songs) => {
    return db.$transaction(
      songs.map((song) => hashSongAndUpdate(song.id, song.lyrics!)),
    )
  },
  {
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
  },
)

export async function updateAllSongHashes() {
  const songs = await db.song.findMany({
    where: { lyrics: { not: null }, lyricsHash: null },
    select: { id: true, lyrics: true },
  })

  const promises = songs.map((song) =>
    batchSongsUpdate({ id: song.id, lyrics: song.lyrics! }),
  )
  await Promise.all(promises)
}
