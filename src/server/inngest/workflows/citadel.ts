import { inngest } from '../client'
import { syncSongs } from '../functions/sync-songs'

export const citadelWorkflow = inngest.createFunction(
  { id: 'citadelWorkflow' },
  { event: 'pipelineTriggered' },
  async function ({ step, event }) {
    const { artistId, maxPages } = event.data

    const songs = await step.invoke('sync_requested', {
      function: syncSongs,
      data: {
        artistId,
        maxPages,
      },
    })

    songs.map((s) => s.full_title)
    const embeddings = await step.run('embedLyrics', function () {
      console.log('the first step ran')
    })
    await step.run('embed', function () {
      console.log('i ran step two')
      return { always: 'one' }
    })
  },
)
