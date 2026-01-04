import { error } from 'node:console'
import { runScraper } from './server/lyrics/legacy'
import { fetchSongMetadata } from './server/lyrics/genius-api'
;[1, 2, 3, 234, 207].map((songId) =>
  fetchSongMetadata({ songId: songId }).catch(error),
)
