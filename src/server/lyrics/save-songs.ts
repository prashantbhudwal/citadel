import z from 'zod'
import { ZSchema } from './schemas'
import path from 'path'
import { promises as fs } from 'fs'
import slugify from 'slugify' // or your own tiny slug util

type TSong = z.infer<typeof ZSchema.Genius.Song>

function toJsonL(songs: TSong[]) {
  const songsJsonL = songs.map((song) => JSON.stringify(song)).join('\n') + '\n'
  return songsJsonL
}

export async function persistSongs({
  songs,
  artistId,
  artistName,
}: {
  songs: TSong[]
  artistId: string
  artistName: string
}) {
  const jsonL = toJsonL(songs)
  const nameSlug = slugify(artistName, { lower: true })
  const dir = path.join(process.cwd(), 'data', `${nameSlug}_${artistId}`)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, 'song_list.jsonl')
  await fs.writeFile(filePath, jsonL, 'utf-8')
}
