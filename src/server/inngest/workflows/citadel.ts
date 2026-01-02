import { inngest } from '../client'
import { fetchSongs } from '../functions/fetch-songs'

export const citadelWorkflow = inngest.createFunction(
  { id: 'citadelWorkflow' },
  { event: 'pipelineTriggered' },
  async function ({ step, event }) {
    step.invoke('fetch-songs', {
      function: fetchSongs,
      data: {
        artistId: event.data.artistId,
        maxPages: event.data.maxPages,
      },
    })
    const embeddings = step.run('embedLyrics', async function () {
      console.log('the first step ran')
    })
    step.run('embed', function () {
      console.log('i ran step two')
      return { always: 'one' }
    })
  },
)
