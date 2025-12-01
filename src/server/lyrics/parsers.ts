import { z } from 'zod'
import { ZSchema } from './schemas'

type TSong = z.infer<typeof ZSchema.Genius.Song>

function toJsonL(songs: TSong[]) {
  const songsJsonL = songs.map((song) => JSON.stringify(song)).join('\n') + '\n'
  return songsJsonL
}

function fromJsonL(jsonL: string): TSong[] {
  const lines = jsonL
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const songs = lines.map((line) => {
    const json = JSON.parse(line) as unknown
    const song = ZSchema.Genius.Song.parse(json)
    return song
  })
  return songs
}

export const parseSongs = {
  toJsonL,
  fromJsonL,
}
