#!/usr/bin/env node

import { geniusApi } from '@/server/lyrics/genius-api'

async function main() {
  const songId = 1171 // "Just Lose It" (known Eminem song)
  console.log(`fetching metadata for song ${songId}...`)

  const json: any = await geniusApi.get(`songs/${songId}`).json()
  const song = json.response.song

  console.log('--- Song Metadata (Partial) ---')
  console.log(`Title: ${song.title}`)
  console.log(`Album Field:`, JSON.stringify(song.album, null, 2))
  console.log(
    `Custom Performances:`,
    JSON.stringify(song.custom_performances, null, 2),
  )
}

main().catch(console.error)
