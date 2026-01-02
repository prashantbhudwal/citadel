import z from 'zod'
import { inngest } from '../client'
import { SongSchema } from '@/server/lyrics/schemas'
import { geniusApi } from '@/server/lyrics/ky'
import { db } from '@/server/prisma'

const SongsResponseSchema = z.object({
  response: z.object({
    songs: z.array(SongSchema),
    next_page: z.number().nullable(),
  }),
})
type TSong = z.infer<typeof SongSchema>

async function fetchSongsPage({
  artistId,
  page,
}: {
  artistId: string
  page: number
}): Promise<{ songs: Array<TSong>; nextPage: number | null }> {
  const json: unknown = await geniusApi
    .get(`artists/${artistId}/songs`, {
      searchParams: {
        page: String(page),
        per_page: '50',
        sort: 'popularity',
        text_format: 'html,markdown',
      },
    })
    .json()

  const result = SongsResponseSchema.safeParse(json)
  if (!result.success) {
    throw result.error
  }
  return {
    songs: result.data.response.songs,
    nextPage: result.data.response.next_page,
  }
}

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

async function persistBatch({ songs }: { songs: Array<TSong> }) {
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

export const syncSongs = inngest.createFunction(
  { id: 'sync-songs' },
  { event: 'songs.sync_requested' },
  async function ({
    event: {
      data: { artistId, maxPages },
    },
    step,
  }) {
    let page: null | number = 1
    const allSongs: Array<TSong> = []
    while (page) {
      const currentPage: number = page
      console.log(`Fetching page ${currentPage}...`)
      try {
        const { nextPage, songs } = await step.run(
          `fetch-song-page-${currentPage}`,
          async () => await fetchSongsPage({ artistId, page: currentPage }),
        )

        await step.run(
          `persist-song-page-${currentPage}`,
          async () => await persistBatch({ songs: songs }),
        )

        console.log(
          `Page ${currentPage}: fetched ${songs.length} songs. Next page: ${nextPage}`,
        )

        if (songs.length === 0) {
          console.log(`No songs found on page ${currentPage}. Stopping.`)
          break
        }

        allSongs.push(...songs)
        page = nextPage

        if (maxPages && page && page > maxPages) {
          console.log(`Reached max pages (${maxPages}). Stopping.`)
          break
        }

        if (page) {
          await step.sleep(`delay-page-${currentPage}`, '1s')
        }
      } catch (e) {
        console.error(`Error fetching page ${currentPage}:`, e)
        throw e
      }
    }
    console.log('⚛️ total songs', allSongs.length)
    return allSongs
  },
)
