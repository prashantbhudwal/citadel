#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  console.log('🕵️‍♀️ Inspecting "No Album" Songs for recent activity...\n')

  const noAlbumSongs = await db.song.findMany({
    where: {
      albums: { none: {} },
    },
    select: {
      id: true,
      title: true,
      metadataFetchedAt: true,
    },
    take: 10,
  })

  const totalNoAlbum = await db.song.count({
    where: { albums: { none: {} } },
  })

  console.log(`Total Songs with NO Album: ${totalNoAlbum}`)
  console.log('Sampling 10:\n')

  for (const song of noAlbumSongs) {
    console.log(`- [${song.id}] "${song.title.slice(0, 30)}..."`)
    console.log(
      `  Fetched At: ${song.metadataFetchedAt ? song.metadataFetchedAt.toISOString() : 'MISSING ❌'}`,
    )
  }

  // Check how many were updated in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const recentUpdates = await db.song.count({
    where: {
      albums: { none: {} },
      metadataFetchedAt: { gte: twoHoursAgo },
    },
  })

  console.log(
    `\nSongs without albums updated in the last 2 hours: ${recentUpdates} / ${totalNoAlbum}`,
  )

  if (recentUpdates === totalNoAlbum && totalNoAlbum > 0) {
    console.log(
      "✅ CONCLUSION: The backfill ran successfully! These songs just don't have albums.",
    )
  } else if (recentUpdates > 0) {
    console.log('⚠️ CONCLUSION: Backfill ran partially.')
  } else {
    console.log(
      "❌ CONCLUSION: These songs have NOT been touched recently. Backfill probably didn't run or skipped them.",
    )
  }
}

main().catch(console.error)
