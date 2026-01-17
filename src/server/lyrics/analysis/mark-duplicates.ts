import { db } from '@/server/prisma'

/**
 * Finds all duplicate groups - songs that share the same lyricsHash.
 * Returns a Map where key = lyricsHash, value = array of song IDs (ordered by id asc).
 * Only includes groups with 2+ songs.
 */
export async function findDuplicateGroups(): Promise<Map<string, number[]>> {
  const songs = await db.song.findMany({
    where: { lyricsHash: { not: null } },
    select: { id: true, lyricsHash: true },
    orderBy: { id: 'asc' },
  })

  // Group by hash
  const byHash = new Map<string, number[]>()
  for (const song of songs) {
    const ids = byHash.get(song.lyricsHash!) ?? []
    ids.push(song.id)
    byHash.set(song.lyricsHash!, ids)
  }

  // Filter to only groups with duplicates
  return new Map([...byHash].filter(([, ids]) => ids.length > 1))
}

/**
 * Marks duplicate songs in the database via SongAnalysis.
 * For each duplicate group, the first song (lowest ID) is kept as canonical,
 * all others are marked as isDuplicate = true in their SongAnalysis.
 */
export async function markDuplicates(): Promise<{
  groupsFound: number
  songsMarked: number
}> {
  const groups = await findDuplicateGroups()

  let songsMarked = 0

  for (const [, songIds] of groups) {
    const [, ...duplicates] = songIds // first one is canonical, rest are duplicates

    for (const songId of duplicates) {
      await db.songAnalysis.upsert({
        where: { songId },
        create: { songId, isDuplicate: true },
        update: { isDuplicate: true },
      })
      songsMarked++
    }
  }

  return {
    groupsFound: groups.size,
    songsMarked,
  }
}

/**
 * Gets the canonical song for a given duplicate.
 * Returns null if the song has no lyricsHash or isn't part of a duplicate group.
 */
export async function getCanonical(songId: number): Promise<number | null> {
  const song = await db.song.findUnique({
    where: { id: songId },
    select: { lyricsHash: true },
  })

  if (!song?.lyricsHash) return null

  const canonical = await db.song.findFirst({
    where: {
      lyricsHash: song.lyricsHash,
      analysis: {
        OR: [{ isDuplicate: false }, { isDuplicate: null }],
      },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  return canonical?.id ?? null
}
