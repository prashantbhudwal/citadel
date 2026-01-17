import { db } from '@/server/prisma'
import type { TSong } from '../genius-api'
import { ZSchema } from '../schemas'
import type { z } from 'zod'

type TArtist = TSong['primary_artist']
type TSongMetadata = z.infer<typeof ZSchema.Genius.SongMetadata>
type TAlbum = NonNullable<TSongMetadata['album']>

async function upsertAlbum(album: TAlbum) {
  const rdc = album.release_date_components

  // Ensure artist exists for the album
  if (album.artist) {
    await upsertArtist(album.artist)
  }

  return db.album.upsert({
    where: { id: album.id },
    update: {
      apiPath: album.api_path,
      fullTitle: album.full_title,
      name: album.name,
      nameWithArtist: album.name_with_artist,
      primaryArtistNames: album.primary_artist_names,
      url: album.url,
      releaseDateYear: rdc?.year ?? null,
      releaseDateMonth: rdc?.month ?? null,
      releaseDateDay: rdc?.day ?? null,
      artistId: album.artist.id,
    },
    create: {
      id: album.id,
      apiPath: album.api_path,
      fullTitle: album.full_title,
      name: album.name,
      nameWithArtist: album.name_with_artist,
      primaryArtistNames: album.primary_artist_names,
      url: album.url,
      releaseDateYear: rdc?.year ?? null,
      releaseDateMonth: rdc?.month ?? null,
      releaseDateDay: rdc?.day ?? null,
      artistId: album.artist.id,
    },
  })
}

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

export async function persistSongMetadata(
  songId: number,
  metadata: TSongMetadata,
) {
  // 1. Upsert all writer artists first
  for (const artist of metadata.writer_artists) {
    await upsertArtist(artist)
  }

  // 2. Upsert (Primary) Album if present
  if (metadata.album) {
    await upsertAlbum(metadata.album)
  }

  // 3. Upsert (Secondary) Albums list if present
  if (metadata.albums && metadata.albums.length > 0) {
    for (const album of metadata.albums) {
      await upsertAlbum(album)
    }
  }

  // 4. Update song with metadata fields + relations
  const writerArtistIds = metadata.writer_artists.map((a) => a.id)
  const albumIds = metadata.albums?.map((a) => a.id) ?? []

  await db.song.update({
    where: { id: songId },
    data: {
      language: metadata.language ?? null,
      explicit: metadata.explicit,
      isMusic: metadata.is_music,
      recordingLocation: metadata.recording_location,
      metadataFetchedAt: new Date(),
      writerArtists: {
        set: writerArtistIds.map((id) => ({ id })),
      },
      // Link primary album if exists
      ...(metadata.album ? { albumId: metadata.album.id } : {}),
      // Link all associated albums
      albums: {
        set: albumIds.map((id) => ({ id })),
      },
    },
  })
}

export async function persistLyrics(songId: number, lyrics: string | null) {
  await db.song.update({
    where: { id: songId },
    data: {
      lyrics: lyrics,
      lyricsFetchedAt: new Date(),
    },
  })
}
