import { inngest } from '../client'
import { processSongs } from '../functions/process-songs'
import { syncSongs } from '../functions/sync-songs'

export const citadelWorkflow = inngest.createFunction(
  { id: 'citadelWorkflow' },
  { event: 'pipelineTriggered' },
  async function ({ step, event }) {
    const { artistId, maxPages } = event.data

    const result = await step.invoke('sync-songs', {
      function: syncSongs,
      data: {
        artistId,
        maxPages,
      },
    })

    await step.invoke('process-songs', {
      function: processSongs,
      data: {
        maxSongs: 10,
      },
    })

    console.log(`Synced ${result.totalSynced} songs`)
    const embeddings = await step.run('embedLyrics', function () {
      console.log('the first step ran')
    })
    await step.run('embed', function () {
      console.log('i ran step two')
      return { always: 'one' }
    })
  },
)
