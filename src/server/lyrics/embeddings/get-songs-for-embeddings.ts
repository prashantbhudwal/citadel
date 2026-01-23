import { db } from '@/server/prisma'
import { EmbeddingSong } from './types'
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './config'

export async function getSongsForEmbeddings({
  targetArtistId,
}: {
  targetArtistId: number
}): Promise<EmbeddingSong[]> {
  const songs = await db.song.findMany({
    where: {
      primaryArtistId: targetArtistId,
      isMusic: {
        equals: true,
      },
      instrumental: {
        equals: false,
      },
      lyrics: { not: null },
      embeddings: {
        none: {
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
        },
      },
      analysis: {
        isDuplicate: false,
        hasFeatures: false,
        isFreestyle: false,
        wordCount: {
          gte: 300,
          lte: 1500,
        },
        hasSuspiciousTitle: false,
      },
    },
    select: {
      id: true,
      lyrics: true,
      primaryArtist: true,
      primaryArtists: true,
      featuredArtists: true,
    },
  })

  const targetArtistSongs = songs.filter(
    (song) =>
      song.primaryArtists.length === 1 && song.featuredArtists.length === 0,
  )
  const filteredSongs = targetArtistSongs

  const songsToEmbed = filteredSongs.map((song) => ({
    id: song.id,
    lyrics: song.lyrics,
  }))

  const songsWithLyrics = songsToEmbed.filter(
    (song): song is EmbeddingSong => song.lyrics !== null,
  )
  return songsWithLyrics
}

/**
 * Relaxed version — get more songs with minimal filtering.
 * Only filters:
 * - Has lyrics
 * - Not already embedded (with current model/dimensions)
 * - Not instrumental
 * - Not a duplicate
 *
 * Allows: features, collaborations, freestyles, any word count, suspicious titles
 */
export async function getSongsForEmbeddingsRelaxed({
  targetArtistId,
}: {
  targetArtistId: number
}): Promise<EmbeddingSong[]> {
  const songs = await db.song.findMany({
    where: {
      primaryArtistId: targetArtistId,
      // Must be music (not skits)
      isMusic: { equals: true },
      // Must have lyrics
      lyrics: { not: null },
      // Not instrumental
      instrumental: { equals: false },
      // Not already embedded with current model
      embeddings: {
        none: {
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
        },
      },
      // Only filter out duplicates (if analysis exists)
      OR: [{ analysis: null }, { analysis: { isDuplicate: { not: true } } }],
    },
    select: {
      id: true,
      lyrics: true,
      title: true,
    },
  })

  const songsToEmbed = songs.map((song) => ({
    id: song.id,
    lyrics: song.lyrics,
  }))

  const songsWithLyrics = songsToEmbed.filter(
    (song): song is EmbeddingSong => song.lyrics !== null,
  )

  return songsWithLyrics
}
