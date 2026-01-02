import { error } from 'node:console'
import { runScraper } from './server/lyrics'

runScraper().catch(error)
