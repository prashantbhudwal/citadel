#!/usr/bin/env node

/**
 * Restores the database from snapshot-latest.db
 * Before restoring:
 *   1. Archives current dev.db to prisma/archives/
 *   2. Archives current schema.prisma to prisma/archives/
 * After restoring:
 *   3. Runs prisma db pull to regenerate schema from restored db
 *   4. Runs prisma generate to regenerate client
 *
 * Usage: pnpm db:restore
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PRISMA_DIR = path.join(process.cwd(), 'prisma')
const ARCHIVES_DIR = path.join(PRISMA_DIR, 'archives')
const DB_PATH = path.join(PRISMA_DIR, 'dev.db')
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma')
const SNAPSHOT_PATH = path.join(PRISMA_DIR, 'snapshot-latest.db')

function getTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function ensureArchivesDir() {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true })
    console.log('📁 Created prisma/archives/')
  }
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function main() {
  // Check if snapshot exists
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('❌ No snapshot found at prisma/snapshot-latest.db')
    console.error('   Run `pnpm db:snapshot` first to create one.')
    process.exit(1)
  }

  console.log('\n🔄 Database Restore')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('This will:')
  console.log('  1. Archive current dev.db and schema.prisma')
  console.log('  2. Restore from snapshot-latest.db')
  console.log('  3. Regenerate schema with prisma db pull')
  console.log('  4. Regenerate client with prisma generate')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const proceed = await confirm('Continue? (y/N): ')
  if (!proceed) {
    console.log('❌ Restore cancelled.')
    process.exit(0)
  }

  const timestamp = getTimestamp()
  ensureArchivesDir()

  // Step 1: Archive current database (if exists)
  if (fs.existsSync(DB_PATH)) {
    const archivedDbPath = path.join(ARCHIVES_DIR, `dev-${timestamp}.db`)
    fs.copyFileSync(DB_PATH, archivedDbPath)
    console.log(`\n📦 Archived: prisma/archives/dev-${timestamp}.db`)
  } else {
    console.log('\n⚠️  No existing dev.db to archive')
  }

  // Step 2: Archive current schema (if exists)
  if (fs.existsSync(SCHEMA_PATH)) {
    const archivedSchemaPath = path.join(
      ARCHIVES_DIR,
      `schema-${timestamp}.prisma`,
    )
    fs.copyFileSync(SCHEMA_PATH, archivedSchemaPath)
    console.log(`📦 Archived: prisma/archives/schema-${timestamp}.prisma`)
  }

  // Step 3: Restore database from snapshot
  fs.copyFileSync(SNAPSHOT_PATH, DB_PATH)
  console.log('\n✓ Restored: prisma/dev.db from snapshot-latest.db')

  // Step 4: Regenerate schema from database
  console.log('\n🔧 Running prisma db pull...')
  try {
    const { stdout: pullOut } = await execAsync('npx prisma db pull')
    console.log(pullOut)
  } catch (error) {
    console.error('⚠️  prisma db pull had issues:', error)
  }

  // Step 5: Regenerate Prisma client
  console.log('🔧 Running prisma generate...')
  try {
    const { stdout: genOut } = await execAsync('npx prisma generate')
    console.log(genOut)
  } catch (error) {
    console.error('⚠️  prisma generate had issues:', error)
  }

  console.log('\n✅ Restore complete!')
  console.log(`\n💡 To undo, your archives are in prisma/archives/`)
  console.log(`   - dev-${timestamp}.db`)
  console.log(`   - schema-${timestamp}.prisma`)
}

main().catch((err) => {
  console.error('❌ Restore failed:', err)
  process.exit(1)
})
