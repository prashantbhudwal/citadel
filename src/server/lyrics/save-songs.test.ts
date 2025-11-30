import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { persistSongs } from './save-songs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import slugify from 'slugify'
const dataDir = path.join(process.cwd(), 'data')
const artistId = '123'
const artistName = 'Sample Artist'
const sampleArtist = {
  _type: 'artist' as const,
  api_path: '/artists/1',
  header_image_url: 'https://example.com/header.jpg',
  id: 1,
  image_url: 'https://example.com/image.jpg',
  index_character: 'A',
  is_meme_verified: false,
  is_verified: true,
  name: 'Sample Artist',
  slug: 'sample-artist',
  url: 'https://example.com/sample-artist',
  iq: null,
}

const sampleSong = {
  _type: 'song' as const,
  annotation_count: 0,
  api_path: '/songs/1',
  artist_names: 'Sample Artist',
  full_title: 'Sample Artist – Sample Song',
  header_image_thumbnail_url: 'https://example.com/thumb.jpg',
  header_image_url: 'https://example.com/header.jpg',
  id: 1,
  instrumental: false,
  lyrics_owner_id: 1,
  lyrics_state: 'complete',
  lyrics_updated_at: Date.now(),
  path: '/Sample-Artist-Sample-Song-lyrics',
  primary_artist_names: 'Sample Artist',
  pyongs_count: null,
  relationships_index_url: 'https://example.com/relationships',
  release_date_components: {
    year: 2024,
    month: 1,
    day: 1,
  },
  release_date_for_display: 'Jan 1, 2024',
  release_date_with_abbreviated_month_for_display: 'Jan 1, 2024',
  song_art_image_thumbnail_url: 'https://example.com/song-thumb.jpg',
  song_art_image_url: 'https://example.com/song.jpg',
  stats: {
    unreviewed_annotations: 0,
    hot: false,
  },
  title: 'Sample Song',
  title_with_featured: 'Sample Song',
  updated_by_human_at: Date.now(),
  url: 'https://example.com/sample-song',
  featured_artists: [],
  primary_artist: sampleArtist,
  primary_artists: [sampleArtist],
}
beforeEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

describe('persistSongs', () => {
  it('writes songs to a newline-delimited JSON file', async () => {
    await persistSongs({ songs: [sampleSong], artistId, artistName })
    const artistDir = path.join(
      dataDir,
      `${slugify(artistName, { lower: true })}_${artistId}`,
    )
    const songsFile = path.join(artistDir, 'song_list.jsonl')
    const persisted = await fs.readFile(songsFile, 'utf8')
    expect(persisted).toBe(JSON.stringify(sampleSong) + '\n')
  })
})
