import { db } from '../prisma'
import type { ZSchema } from './schemas'
import type { z } from 'zod'
import type {
  Artist as DbArtist,
  Song as DbSong,
} from '@/generated/prisma/client'

type TSong = z.infer<typeof ZSchema.Genius.Song>
type TArtist = z.infer<typeof ZSchema.Genius.Artist>
type TAlbum = z.infer<typeof ZSchema.Genius.Album>

const toArtistWriteData = (artist: TArtist) => ({
  apiPath: artist.api_path,
  imageUrl: artist.image_url,
  indexCharacter: artist.index_character,
  isMemeVerified: artist.is_meme_verified,
  isVerified: artist.is_verified,
  name: artist.name,
  slug: artist.slug,
  url: artist.url,
  iq: artist.iq,
})

const toZodArtist = (artist: DbArtist): TArtist => ({
  _type: 'artist',
  api_path: artist.apiPath,
  header_image_url: '',
  id: artist.id,
  image_url: artist.imageUrl,
  index_character: artist.indexCharacter,
  is_meme_verified: artist.isMemeVerified,
  is_verified: artist.isVerified,
  name: artist.name,
  slug: artist.slug,
  url: artist.url,
  iq: artist.iq ?? undefined,
})

const toSongWriteData = (song: TSong) => ({
  annotationCount: song.annotation_count,
  apiPath: song.api_path,
  artistNames: song.artist_names,
  fullTitle: song.full_title,
  instrumental: song.instrumental,
  lyricsOwnerId: song.lyrics_owner_id,
  lyricsState: song.lyrics_state,
  lyricsUpdatedAt: song.lyrics_updated_at,
  path: song.path,
  primaryArtistNames: song.primary_artist_names,
  pyongsCount: song.pyongs_count,
  relationshipsIndexUrl: song.relationships_index_url,
  statsUnreviewedAnnotations: song.stats.unreviewed_annotations,
  statsHot: song.stats.hot,
  title: song.title,
  titleWithFeatured: song.title_with_featured,
  updatedByHumanAt: song.updated_by_human_at,
  url: song.url,
})

function toZodSong(
  song: DbSong & {
    primaryArtist: DbArtist
    primaryArtists: Array<DbArtist>
    featuredArtists: Array<DbArtist>
  },
): TSong {
  return {
    _type: 'song',
    annotation_count: song.annotationCount,
    api_path: song.apiPath,
    artist_names: song.artistNames,
    full_title: song.fullTitle,
    header_image_thumbnail_url: '',
    header_image_url: '',
    id: song.id,
    instrumental: song.instrumental,
    lyrics_owner_id: song.lyricsOwnerId,
    lyrics_state: song.lyricsState,
    lyrics_updated_at: song.lyricsUpdatedAt,
    path: song.path,
    primary_artist_names: song.primaryArtistNames,
    pyongs_count: song.pyongsCount,
    relationships_index_url: song.relationshipsIndexUrl,
    release_date_components: null,
    release_date_for_display: null,
    release_date_with_abbreviated_month_for_display: null,
    song_art_image_thumbnail_url: '',
    song_art_image_url: '',
    stats: {
      unreviewed_annotations: song.statsUnreviewedAnnotations,
      hot: song.statsHot,
    },
    title: song.title,
    title_with_featured: song.titleWithFeatured,
    updated_by_human_at: song.updatedByHumanAt,
    url: song.url,
    primary_artist: toZodArtist(song.primaryArtist),
    featured_artists: song.featuredArtists.map(toZodArtist),
    primary_artists: song.primaryArtists.map(toZodArtist),
  }
}

// Helper to upsert an Artist
async function upsertArtist(artist: TArtist) {
  return db.artist.upsert({
    where: { id: artist.id },
    update: toArtistWriteData(artist),
    create: {
      id: artist.id,
      ...toArtistWriteData(artist),
    },
  })
}

// Helper to upsert an Album
export async function upsertAlbum(album: TAlbum) {
  // Ensure artist exists first
  await upsertArtist(album.artist)

  // Ensure primary artists exist
  for (const artist of album.primary_artists) {
    await upsertArtist(artist)
  }

  const primaryArtistConnections = album.primary_artists.map((a: TArtist) => ({
    id: a.id,
  }))

  return db.album.upsert({
    where: { id: album.id },
    update: {
      apiPath: album.api_path,
      fullTitle: album.full_title,
      name: album.name,
      nameWithArtist: album.name_with_artist,
      primaryArtistNames: album.primary_artist_names,
      url: album.url,
      artistId: album.artist.id,
      primaryArtists: {
        connect: primaryArtistConnections,
      },
    },
    create: {
      id: album.id,
      apiPath: album.api_path,
      fullTitle: album.full_title,
      name: album.name,
      nameWithArtist: album.name_with_artist,
      primaryArtistNames: album.primary_artist_names,
      url: album.url,
      artistId: album.artist.id,
      primaryArtists: {
        connect: primaryArtistConnections,
      },
    },
  })
}

async function persistSongList({
  songs,
  artistId: _artistId, // Kept for interface compatibility, though usually derived from song
}: {
  songs: Array<TSong>
  artistId: string
}) {
  for (const song of songs) {
    // 1. Upsert Primary Artist
    await upsertArtist(song.primary_artist)

    // 2. Upsert Featured Artists
    for (const artist of song.featured_artists) {
      await upsertArtist(artist)
    }

    // 3. Upsert Primary Artists List
    for (const artist of song.primary_artists) {
      await upsertArtist(artist)
    }

    const baseSongData = toSongWriteData(song)
    const primaryArtistConnections = song.primary_artists.map((a: TArtist) => ({
      id: a.id,
    }))
    const featuredArtistConnections = song.featured_artists.map(
      (a: TArtist) => ({ id: a.id }),
    )

    await db.song.upsert({
      where: { id: song.id },
      update: {
        ...baseSongData,
        primaryArtist: { connect: { id: song.primary_artist.id } },
        primaryArtists: {
          connect: primaryArtistConnections,
        },
        featuredArtists: {
          connect: featuredArtistConnections,
        },
      },
      create: {
        id: song.id,
        ...baseSongData,
        primaryArtist: { connect: { id: song.primary_artist.id } },
        primaryArtists: {
          connect: primaryArtistConnections,
        },
        featuredArtists: {
          connect: featuredArtistConnections,
        },
      },
    })
  }
}

async function readSongList({
  artistId,
}: {
  artistId: string
}): Promise<Array<TSong>> {
  // Query DB

  const primaryArtistId = Number.parseInt(artistId, 10)
  const dbSongs = await db.song.findMany({
    where: {
      primaryArtistId,
    },
    include: {
      primaryArtist: true,
      primaryArtists: true,
      featuredArtists: true,
    },
  })

  // Map back to Zod shape
  return dbSongs.map(toZodSong)
}

async function appendLyric({
  artistId: _artistId,
  lyricData,
}: {
  artistId: string
  lyricData: TSong & { lyrics: string }
}) {
  await db.song.update({
    where: { id: lyricData.id },
    data: {
      lyrics: lyricData.lyrics,
    },
  })
}

export const dbService = {
  songs: {
    write: persistSongList,
    read: readSongList,
  },
  lyrics: {
    append: appendLyric,
  },
}
