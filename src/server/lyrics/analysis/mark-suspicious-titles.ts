import { db } from '@/server/prisma'
import { BatchSong, createSongBatchProcessor } from './batch-processor'
import { SUSPICIOUS_KEYWORDS, DELIMITED_VARIANTS_REGEX } from './config'

export function isSuspiciousTitle(title: string): boolean {
  const titleLower = title.toLowerCase()

  // Check blacklist keywords
  const hasBlacklistKeyword = SUSPICIOUS_KEYWORDS.some((k) =>
    titleLower.includes(k),
  )
  if (hasBlacklistKeyword) return true

  // Check delimited variants like (Clean) or [Dirty]
  if (DELIMITED_VARIANTS_REGEX.test(title)) return true

  return false
}

const checkSuspiciousTitleAndUpdate = ({ song }: { song: BatchSong }) => {
  const hasSuspiciousTitle = isSuspiciousTitle(song.title!)
  return db.songAnalysis.upsert({
    where: { songId: song.id },
    create: { songId: song.id, hasSuspiciousTitle },
    update: { hasSuspiciousTitle },
  })
}

const processBatch = createSongBatchProcessor({
  processingFn: checkSuspiciousTitleAndUpdate,
})

export async function markSuspiciousTitles() {
  const songs = await db.song.findMany({
    where: {
      OR: [{ analysis: null }, { analysis: { hasSuspiciousTitle: null } }],
    },
    select: {
      id: true,
      title: true,
      lyrics: true, // Required by BatchSong type
    },
  })

  await processBatch(songs)
}
