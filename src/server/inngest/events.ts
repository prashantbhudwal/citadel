import { maxSize, z } from 'zod'

export const eventsMap = {
  pipelineTriggered: z.object({
    artistId: z.string(),
    maxPages: z.number().optional(),
  }),
  'songs.fetch_requested': z.object({
    artistId: z.string(),
    maxPages: z.number().optional(),
  }),
} as const

export type CitadelEvents = typeof eventsMap
