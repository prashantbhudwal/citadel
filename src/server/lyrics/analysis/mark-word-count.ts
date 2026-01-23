import { db } from '@/server/prisma'
import { countLyricsWords } from '../lib/word-count'
import { BatchSong, createSongBatchProcessor } from './batch-processor'
// fetch songs without wordcount, wordcount is in the SongAnalysis table

const countWordsAndUpdate = ({
  song,
}: {
  song: BatchSong
}): ReturnType<typeof db.songAnalysis.upsert> => {
  // Handle null lyrics - count as 0 words
  const wordCount = song.lyrics ? countLyricsWords(song.lyrics) : 0
  return db.songAnalysis.upsert({
    where: { songId: song.id },
    create: { songId: song.id, wordCount },
    update: { wordCount },
  })
}

const processBatch = createSongBatchProcessor({
  processingFn: countWordsAndUpdate,
})

export async function markWordCount() {
  const songs = await db.song.findMany({
    where: {
      OR: [{ analysis: null }, { analysis: { wordCount: null } }],
    },
    select: {
      id: true,
      lyrics: true,
    },
  })

  await processBatch(songs)
}
