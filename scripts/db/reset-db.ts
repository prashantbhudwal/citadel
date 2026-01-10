#!/usr/bin/env node

import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log('\n⚠️  WARNING: This will DELETE ALL DATA in your database!')
console.log('   - All Songs, Artists, and Albums will be removed')
console.log('   - Migrations will be re-applied\n')

rl.question('Type the password to confirm: ', async (answer) => {
  if (answer.trim() === 'clean-slate') {
    console.log('\n🗑️  Resetting database...\n')
    try {
      const { stdout, stderr } = await execAsync(
        'npx prisma migrate reset --force',
      )
      console.log(stdout)
      if (stderr) console.error(stderr)
      console.log('\n✅ Database reset complete!')
    } catch (error) {
      console.error('❌ Reset failed:', error)
      process.exit(1)
    }
  } else {
    console.log('\n❌ Reset cancelled. You typed:', answer)
  }
  rl.close()
})
