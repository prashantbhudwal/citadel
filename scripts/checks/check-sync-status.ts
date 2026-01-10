#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  console.log('📊 Checking Metadata Sync Status...\n')

  const total = await db.song.count()
  const synced = await db.song.count({
    where: {
      metadataFetchedAt: { not: null },
    },
  })

  const pending = total - synced
  const percent = total > 0 ? ((synced / total) * 100).toFixed(1) : '0.0'

  console.log(`Total Songs:   ${total}`)
  console.log(`Synced:        ${synced} (${percent}%)`)
  console.log(`Pending:       ${pending}`)

  await db.$disconnect()
}

main().catch(console.error)
