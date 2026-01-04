import { inngest } from './client'
import { syncMetadata } from './functions/sync-metadata'
import { syncSongs } from './functions/sync-songs'
import { citadelWorkflow } from './workflows/citadel'
import { type ServeHandlerOptions } from 'inngest'

export const inngestOptions: ServeHandlerOptions = {
  client: inngest,
  functions: [citadelWorkflow, syncSongs, syncMetadata],
  streaming: 'force',
}
