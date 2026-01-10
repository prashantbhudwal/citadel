#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  console.log('🔍 Analyzing Song-Album connections...\n')

  const total = await db.song.count()
  const withoutAlbum = await db.song.count({
    where: {
      albumId: null,
    },
  })

  const withAlbum = total - withoutAlbum

  console.log(`Total Songs: ${total}`)
  console.log(
    `With Album:  ${withAlbum} (${((withAlbum / total) * 100).toFixed(1)}%)`,
  )
  console.log(
    `No Album:    ${withoutAlbum} (${((withoutAlbum / total) * 100).toFixed(1)}%)`,
  )

  if (withAlbum === 0) {
    console.log(
      '\n⚠️  It appears NO songs have albums linked. Did we run the album sync step?',
    )
  }

  await db.$disconnect()
}

main().catch(console.error)
