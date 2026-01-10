#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  const songs = await db.song.findMany({
    where: { lyrics: { not: null } },
    select: { id: true, title: true, lyrics: true },
  })

  const processed = songs.map((s) => ({
    id: s.id,
    title: s.title,
    count: s.lyrics!.trim().split(/\s+/).length,
  }))

  console.log('--- EXTREME LONG OUTLIERS (> 2000 words) ---')
  processed
    .filter((s) => s.count > 2000)
    .sort((a, b) => b.count - a.count)
    .forEach((s) => console.log(`${s.count} words: ${s.title} (ID: ${s.id})`))

  console.log('\n--- EXTREME SHORT OUTLIERS (< 10 words) ---')
  processed
    .filter((s) => s.count < 10)
    .sort((a, b) => a.count - b.count)
    .slice(0, 20)
    .forEach((s) => console.log(`${s.count} words: ${s.title} (ID: ${s.id})`))
}

main().catch(console.error)
