import { inngest } from './client'
import { processPage } from './functions/process-page'
import { syncLyrics } from './functions/sync-lyrics'
import { syncMetadata } from './functions/sync-metadata'
import { syncSongs } from './functions/sync-songs'
import { citadelWorkflow } from './workflows/citadel'
import { backfillAlbums } from './functions/backfill-albums'
import { type ServeHandlerOptions } from 'inngest'

export const inngestOptions: ServeHandlerOptions = {
  client: inngest,
  functions: [
    citadelWorkflow,
    syncSongs,
    syncMetadata,
    syncLyrics,
    processPage,
    backfillAlbums,
  ],
  streaming: 'force',
}
