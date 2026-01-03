import { db } from '@/server/prisma'
import type { TSong } from './genius-api'

type TArtist = TSong['primary_artist']

async function upsertArtist(artist: TArtist) {
  return db.artist.upsert({
    where: { id: artist.id },
    update: {
      apiPath: artist.api_path,
      imageUrl: artist.image_url,
      indexCharacter: artist.index_character,
      isMemeVerified: artist.is_meme_verified,
      isVerified: artist.is_verified,
      name: artist.name,
      slug: artist.slug,
      url: artist.url,
      iq: artist.iq ?? null,
    },
    create: {
      id: artist.id,
      apiPath: artist.api_path,
      imageUrl: artist.image_url,
      indexCharacter: artist.index_character,
      isMemeVerified: artist.is_meme_verified,
      isVerified: artist.is_verified,
      name: artist.name,
      slug: artist.slug,
      url: artist.url,
      iq: artist.iq ?? null,
    },
  })
}

export async function persistSongBatch(songs: TSong[]) {
  if (songs.length === 0) return

  for (const song of songs) {
    // 1. Upsert all artists first
    await upsertArtist(song.primary_artist)
    for (const artist of song.primary_artists) {
      await upsertArtist(artist)
    }
    for (const artist of song.featured_artists) {
      await upsertArtist(artist)
    }

    const rdc = song.release_date_components

    // 2. Upsert the song using Unchecked input (foreign key IDs directly)
    await db.song.upsert({
      where: { id: song.id },
      update: {
        apiPath: song.api_path,
        fullTitle: song.full_title,
        title: song.title,
        titleWithFeatured: song.title_with_featured,
        instrumental: song.instrumental,
        lyricsOwnerId: song.lyrics_owner_id,
        lyricsState: song.lyrics_state,
        lyricsUpdatedAt: song.lyrics_updated_at,
        path: song.path,
        updatedByHumanAt: song.updated_by_human_at,
        url: song.url,
        annotationCount: song.annotation_count,
        artistNames: song.artist_names,
        primaryArtistNames: song.primary_artist_names,
        pyongsCount: song.pyongs_count,
        relationshipsIndexUrl: song.relationships_index_url,
        statsUnreviewedAnnotations: song.stats.unreviewed_annotations,
        statsHot: song.stats.hot,
        releaseDateYear: rdc?.year ?? null,
        releaseDateMonth: rdc?.month ?? null,
        releaseDateDay: rdc?.day ?? null,
        primaryArtistId: song.primary_artist.id,
      },
      create: {
        id: song.id,
        apiPath: song.api_path,
        fullTitle: song.full_title,
        title: song.title,
        titleWithFeatured: song.title_with_featured,
        instrumental: song.instrumental,
        lyricsOwnerId: song.lyrics_owner_id,
        lyricsState: song.lyrics_state,
        lyricsUpdatedAt: song.lyrics_updated_at,
        path: song.path,
        updatedByHumanAt: song.updated_by_human_at,
        url: song.url,
        annotationCount: song.annotation_count,
        artistNames: song.artist_names,
        primaryArtistNames: song.primary_artist_names,
        pyongsCount: song.pyongs_count,
        relationshipsIndexUrl: song.relationships_index_url,
        statsUnreviewedAnnotations: song.stats.unreviewed_annotations,
        statsHot: song.stats.hot,
        releaseDateYear: rdc?.year ?? null,
        releaseDateMonth: rdc?.month ?? null,
        releaseDateDay: rdc?.day ?? null,
        primaryArtistId: song.primary_artist.id,
      },
    })

    // 3. Handle many-to-many relations separately (after song exists)
    const primaryArtistIds = song.primary_artists.map((a) => a.id)
    const featuredArtistIds = song.featured_artists.map((a) => a.id)

    if (primaryArtistIds.length > 0 || featuredArtistIds.length > 0) {
      await db.song.update({
        where: { id: song.id },
        data: {
          primaryArtists: {
            set: primaryArtistIds.map((id) => ({ id })),
          },
          featuredArtists: {
            set: featuredArtistIds.map((id) => ({ id })),
          },
        },
      })
    }
  }
}
