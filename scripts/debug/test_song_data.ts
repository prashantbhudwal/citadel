import { fullSong } from './song_debug_full'

const log = console.dir

const {
  response: { song: s },
} = fullSong

log(s.title)
log(s.album)
log(
  s.albums.map((album) => {
    return {
      date: album.release_date_components,
      title: album.full_title,
    }
  }),
)
log(s.release_date_components)
