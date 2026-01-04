import { maxSize, z } from 'zod'

export const eventsMap = {
  pipelineTriggered: z.object({
    artistId: z.number(),
    maxPages: z.number().optional(),
  }),
  'songs.sync_requested': z.object({
    artistId: z.number(),
    maxPages: z.number().optional(),
  }),
  'songs.sync.metadata_requested': z.object({
    songId: z.number(),
  }),
  'songs.sync.lyrics_requested': z.object({
    songUrl: z.string(),
    songId: z.number(),
  }),
  'songs.process_page_requested': z.object({
    songs: z.array(
      z.object({
        id: z.number(),
        url: z.string(),
      }),
    ),
  }),
  'song.processing_requested': z.object({
    maxSongs: z.number().optional(),
  }),
} as const

export type CitadelEvents = typeof eventsMap
