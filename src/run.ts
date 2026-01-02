import { error } from 'node:console'
import { runScraper } from './server/lyrics/legacy'

runScraper().catch(error)
