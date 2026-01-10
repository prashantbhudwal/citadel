import fs from 'node:fs/promises'
import { z } from 'zod'

// Simplified Schema for debugging
const SimpleSchema = z.object({
  meta: z.object({
    status: z.number(),
  }),
})

// 2. Run Validation
async function run() {
  const jsonPath = 'plan/shaping/artist_45_debug.json'
  console.log(`📄 Reading ${jsonPath}...`)

  try {
    const data = await fs.readFile(jsonPath, 'utf-8')
    const json = JSON.parse(data)

    console.log('🔍 Validating against Simple Schema...')
    const result = SimpleSchema.safeParse(json)

    if (result.success) {
      console.log('✅ Validation Successful (Simple)!')
    } else {
      console.error('❌ Validation Failed (Simple):')
      console.error(result.error)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

run()
