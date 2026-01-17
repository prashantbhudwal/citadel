import { db } from '@/server/prisma'
import { BatchSong, createSongBatchProcessor } from './batch-processor'

/**
 * Checks if a song has features (collaborations).
 * A song has features if it has any featured artists OR multiple primary artists.
 */
export function hasFeatures(song: BatchSong): boolean {
  const featuredCount = song._count?.featuredArtists ?? 0
  const primaryCount = song._count?.primaryArtists ?? 0
  return featuredCount > 0 || primaryCount > 1
}

const checkFeaturesAndUpdate = ({ song }: { song: BatchSong }) => {
  const hasFeaturesResult = hasFeatures(song)
  return db.songAnalysis.upsert({
    where: { songId: song.id },
    create: { songId: song.id, hasFeatures: hasFeaturesResult },
    update: { hasFeatures: hasFeaturesResult },
  })
}

const processBatch = createSongBatchProcessor({
  processingFn: checkFeaturesAndUpdate,
})

export async function markFeatures() {
  const songs = await db.song.findMany({
    where: {
      analysis: {
        hasFeatures: null,
      },
    },
    select: {
      id: true,
      lyrics: true, // Required by BatchSong type
      _count: {
        select: {
          featuredArtists: true,
          primaryArtists: true,
        },
      },
    },
  })

  await processBatch(songs)
}
