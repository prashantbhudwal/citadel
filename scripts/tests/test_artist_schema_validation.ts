import fs from 'node:fs/promises'
import { z } from 'zod'

// 1. Define the Schema based on artist_45_debug.json
const DescriptionSchema = z.object({
  plain: z.string().optional(),
  markdown: z.string().optional(),
  dom: z.any().optional(), // Using z.any() to avoid recursion issues
})

const UserMetadataSchema = z.object({
  permissions: z.array(z.string()),
  excluded_permissions: z.array(z.string()),
  interactions: z.any().optional(),
})

const ArtistDetailsSchema = z.object({
  _type: z.literal('artist'),
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  url: z.string(),
  api_path: z.string(),
  header_image_url: z.string(), // Removing .url() temporarily to isolate issues
  image_url: z.string(),
  index_character: z.string(),
  is_meme_verified: z.boolean(),
  is_verified: z.boolean(),
  iq: z.number().nullable().optional(),

  // Specific fields for details endpoint
  alternate_names: z.array(z.string()).optional(),
  description: DescriptionSchema.optional(),
  facebook_name: z.string().nullable().optional(),
  instagram_name: z.string().nullable().optional(),
  twitter_name: z.string().nullable().optional(),
  followers_count: z.number().optional(),
  current_user_metadata: UserMetadataSchema.optional(),
  description_annotation: z.any().optional(), // Complex referent object
})

const ArtistResponseSchema = z.object({
  meta: z.object({
    status: z.number(),
  }),
  response: z.object({
    artist: ArtistDetailsSchema,
  }),
})

// 2. Run Validation
async function run() {
  const jsonPath = 'plan/shaping/artist_45_debug.json'
  console.log(`📄 Reading ${jsonPath}...`)

  try {
    const data = await fs.readFile(jsonPath, 'utf-8')
    const json = JSON.parse(data)

    console.log('🔍 Validating against Schema...')
    const result = ArtistResponseSchema.safeParse(json)

    if (result.success) {
      console.log('✅ Validation Successful!')
      console.log('Parsed Name:', result.data.response.artist.name)
      console.log(
        'Description Formats:',
        Object.keys(result.data.response.artist.description || {}).join(', '),
      )
    } else {
      console.error('❌ Validation Failed:')
      console.error(JSON.stringify(result.error.format(), null, 2))
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

run()
