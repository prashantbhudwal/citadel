import { inngest } from '../client'

export const processSongs = inngest.createFunction(
  { id: 'process-songs' },
  { event: 'song.processing_requested' },
    async function ({ step, event }) {
      
  },
)
