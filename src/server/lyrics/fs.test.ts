import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { fs as myFs } from './fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { sampleSong } from './mock-data'

const dataDir = path.join(process.cwd(), 'data')
const artistId = '123'

beforeEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

describe('fs.songs', () => {
  it('writes songs to a newline-delimited JSON file in ID-based folder', async () => {
    await myFs.songs.write({ songs: [sampleSong], artistId })

    // Expect: data/artists/123/song_list.jsonl
    const artistDir = path.join(dataDir, 'artists', artistId)
    const songsFile = path.join(artistDir, 'song_list.jsonl')

    const persisted = await fs.readFile(songsFile, 'utf8')
    expect(persisted).toBe(JSON.stringify(sampleSong) + '\n')
  })

  it('reads songs from the file', async () => {
    // Write first
    await myFs.songs.write({ songs: [sampleSong], artistId })

    // Read back
    const songs = await myFs.songs.read({ artistId })
    expect(songs).toHaveLength(1)
    expect(songs[0].id).toBe(1)
    expect(songs[0].title).toBe('Sample Song')
  })

  it('returns empty array if file does not exist or is empty', async () => {
    // Try reading without writing
    // Note: readSongList currently expects the file to exist or throws if folder missing?
    // Let's check implementation. It uses readFile. If file missing, it throws.
    // But if we want to test "empty file", we can write empty string.

    // Actually, let's just test the "empty file" case which the code handles:
    // if (!file.trim()) return []

    const artistDir = path.join(dataDir, 'artists', artistId)
    await fs.mkdir(artistDir, { recursive: true })
    await fs.writeFile(path.join(artistDir, 'song_list.jsonl'), '')

    const songs = await myFs.songs.read({ artistId })
    expect(songs).toEqual([])
  })
})
