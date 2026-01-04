import z from 'zod'
import { SongSchema, ZSchema } from '@/server/lyrics/schemas'
import ky from 'ky'

export const geniusApi = ky.create({
  prefixUrl: 'https://www.genius.com/api',
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  retry: {
    limit: 3,
    methods: ['get'],
    statusCodes: [429, 500, 502, 503, 504],
  },
})

export type TGeniusApi = typeof geniusApi

const SongsResponseSchema = z.object({
  response: z.object({
    songs: z.array(SongSchema),
    next_page: z.number().nullable(),
  }),
})

export type TSong = z.infer<typeof SongSchema>

export async function fetchSongsPage({
  artistId,
  page,
}: {
  artistId: number
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

const MetadataResponseSchema = z.object({
  response: z.object({
    song: ZSchema.Genius.SongMetadata,
  }),
})

export async function fetchSongMetadata({ songId }: { songId: number }) {
  const json: unknown = await geniusApi.get(`songs/${songId}`).json()

  const result = MetadataResponseSchema.safeParse(json)
  if (!result.success) {
    throw result.error
  }
  console.log(result.data.response.song)
  return { metadata: result.data.response.song }
}
