import path from 'node:path'
import { promises as fsp } from 'node:fs'
import { parseSongs } from './parsers'
import type z from 'zod'
import type { ZSchema } from '../schemas'

type TSong = z.infer<typeof ZSchema.Genius.Song>

const BASE_DIR = 'data'
const SONG_LIST_FILE_NAME = 'song_list.jsonl'

const getArtistDir = function ({ artistId }: { artistId: string }) {
  const dir = path.join(process.cwd(), BASE_DIR, 'artists', artistId)
  return dir
}
async function persistSongList({
  songs,
  artistId,
}: {
  songs: Array<TSong>
  artistId: string
}) {
  const songsJsonL = parseSongs.toJsonL(songs)
  const dir = getArtistDir({ artistId })
  await fsp.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, SONG_LIST_FILE_NAME)
  await fsp.writeFile(filePath, songsJsonL, 'utf-8')
}

async function readSongList({
  artistId,
}: {
  artistId: string
}): Promise<Array<TSong>> {
  const dir = getArtistDir({ artistId })
  const filePath = path.join(dir, SONG_LIST_FILE_NAME)

  const file = await fsp.readFile(filePath, 'utf-8')
  // “file exists but has nothing meaningful in it” => []
  if (!file.trim()) {
    return []
  }

  const songs = parseSongs.fromJsonL(file)
  return songs
}

const LYRICS_FILE_NAME = 'lyrics.jsonl'

async function appendLyric({
  artistId,
  lyricData,
}: {
  artistId: string
  lyricData: TSong & { lyrics: string }
}) {
  const dir = getArtistDir({ artistId })
  await fsp.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, LYRICS_FILE_NAME)
  const line = JSON.stringify(lyricData) + '\n'
  await fsp.appendFile(filePath, line, 'utf-8')
}

export const fs = {
  songs: {
    write: persistSongList,
    read: readSongList,
  },
  lyrics: {
    append: appendLyric,
  },
}
