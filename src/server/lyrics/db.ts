import { db } from '@/server/prisma'
import type { TSong } from './genius-api'

const mapArtist = (artist: any) => ({
  where: { id: artist.id },
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

export async function persistSongBatch(songs: TSong[]) {
  if (songs.length === 0) return

  await db.$transaction(
    songs.map((song) => {
      const rdc = song.release_date_components
      return db.song.upsert({
        where: { id: song.id },
        update: {
          apiPath: song.api_path,
          fullTitle: song.full_title,
          lyricsState: song.lyrics_state,
          lyricsUpdatedAt: song.lyrics_updated_at,
          updatedByHumanAt: song.updated_by_human_at,
          statsUnreviewedAnnotations: song.stats.unreviewed_annotations,
          statsHot: song.stats.hot,
          title: song.title,
          titleWithFeatured: song.title_with_featured,
          url: song.url,
          pyongsCount: song.pyongs_count,
          annotationCount: song.annotation_count,
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
          primaryArtist: { connectOrCreate: mapArtist(song.primary_artist) },
          primaryArtists: {
            connectOrCreate: song.primary_artists.map(mapArtist),
          },
          featuredArtists: {
            connectOrCreate: song.featured_artists.map(mapArtist),
          },
        },
      })
    }),
  )
}
