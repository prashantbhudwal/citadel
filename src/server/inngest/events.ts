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
} as const

export type CitadelEvents = typeof eventsMap
