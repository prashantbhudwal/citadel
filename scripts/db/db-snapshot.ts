#!/usr/bin/env node

/**
 * Creates a timestamped snapshot of the current database.
 * Usage: pnpm db:snapshot
 */

import * as fs from 'fs'
import * as path from 'path'

const PRISMA_DIR = path.join(process.cwd(), 'prisma')
const DB_PATH = path.join(PRISMA_DIR, 'dev.db')

function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

async function main() {
  // Check if dev.db exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ No database found at prisma/dev.db')
    process.exit(1)
  }

  const timestamp = getTimestamp()
  const snapshotName = `snapshot-${timestamp}.db`
  const snapshotPath = path.join(PRISMA_DIR, snapshotName)
  const latestPath = path.join(PRISMA_DIR, 'snapshot-latest.db')

  // Copy database to timestamped snapshot
  fs.copyFileSync(DB_PATH, snapshotPath)
  console.log(`✓ Created: prisma/${snapshotName}`)

  // Also update snapshot-latest.db for easy restore
  fs.copyFileSync(DB_PATH, latestPath)
  console.log(`✓ Updated: prisma/snapshot-latest.db`)

  // Show file size
  const stats = fs.statSync(snapshotPath)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
  console.log(`\n📦 Snapshot size: ${sizeMB} MB`)
}

main().catch((err) => {
  console.error('❌ Snapshot failed:', err)
  process.exit(1)
})
