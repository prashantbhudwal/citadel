import z from 'zod'
import { SongSchema } from '@/server/lyrics/schemas'
import { geniusApi } from '@/server/lyrics/ky'

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
