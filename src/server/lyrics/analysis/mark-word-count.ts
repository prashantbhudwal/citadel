import { db } from '@/server/prisma'
import { countLyricsWords } from '../lib/word-count'
import { BatchSong, createSongBatchProcessor } from './batch-processor'
// fetch songs without wordcount, wordcount is in the SongAnalysis table

const countWordsAndUpdate = ({
  song,
}: {
  song: BatchSong
}): ReturnType<typeof db.songAnalysis.upsert> => {
  const wordCount = countLyricsWords(song.lyrics!)
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
      analysis: {
        wordCount: null,
      },
    },
    select: {
      id: true,
      lyrics: true,
    },
  })

  await processBatch(songs)
}
