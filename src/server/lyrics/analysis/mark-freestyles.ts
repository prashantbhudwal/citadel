import { db } from '@/server/prisma'
import { BatchSong, createSongBatchProcessor } from './batch-processor'

/**
 * Checks if a song title indicates it's a freestyle.
 */
export function isFreestyle(title: string): boolean {
  return title.toLowerCase().includes('freestyle')
}

const checkFreestyleAndUpdate = ({ song }: { song: BatchSong }) => {
  const isFreestyleResult = isFreestyle(song.title!)
  return db.songAnalysis.upsert({
    where: { songId: song.id },
    create: { songId: song.id, isFreestyle: isFreestyleResult },
    update: { isFreestyle: isFreestyleResult },
  })
}

const processBatch = createSongBatchProcessor({
  processingFn: checkFreestyleAndUpdate,
})

export async function markFreestyles() {
  const songs = await db.song.findMany({
    where: {
      analysis: {
        isFreestyle: null,
      },
    },
    select: {
      id: true,
      title: true,
      lyrics: true, // Required by BatchSong type
    },
  })

  await processBatch(songs)
}
