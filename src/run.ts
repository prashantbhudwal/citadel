import { error } from 'console'
import { runScraper } from './server/lyrics'

runScraper().catch(error)
