#!/usr/bin/env node

/**
 * Data exploration script to understand "solo" song classification.
 * Explores edge cases and data shape before implementing isSolo logic.
 *
 * Usage: npx tsx scripts/explore-solo-logic.ts
 */

import { db } from '@/server/prisma'

async function exploreSoloLogic() {
  console.log('🔍 Exploring solo song classification logic...\n')

  // Sample songs with all artist relationships
  const songs = await db.song.findMany({
    take: 100, // random sample
    include: {
      primaryArtist: true,
      primaryArtists: true,
      featuredArtists: true,
      writerArtists: true,
    },
    orderBy: { id: 'asc' }, // deterministic for now
  })

  // Categories to explore
  const categories = {
    // Clear solo: 1 primary, 0 featured
    clearSolo: [] as typeof songs,
    // Clear collab: 1 primary, 1+ featured
    clearCollab: [] as typeof songs,
    // Multi-primary: 2+ primary artists
    multiPrimary: [] as typeof songs,
    // Edge: Primary artist also in featured (duplicate role)
    primaryInFeatured: [] as typeof songs,
    // Edge: Primary artist also in writers
    primaryInWriters: [] as typeof songs,
    // Edge: Featured artist also in writers
    featuredInWriters: [] as typeof songs,
  }

  for (const song of songs) {
    const primaryIds = new Set(song.primaryArtists.map((a) => a.id))
    const featuredIds = new Set(song.featuredArtists.map((a) => a.id))
    const writerIds = new Set(song.writerArtists.map((a) => a.id))

    // Check for overlaps
    const primaryInFeatured = [...primaryIds].some((id) => featuredIds.has(id))
    const primaryInWriters = [...primaryIds].some((id) => writerIds.has(id))
    const featuredInWriters = [...featuredIds].some((id) => writerIds.has(id))

    // Categorize
    if (song.primaryArtists.length > 1) {
      categories.multiPrimary.push(song)
    } else if (song.featuredArtists.length === 0) {
      categories.clearSolo.push(song)
    } else {
      categories.clearCollab.push(song)
    }

    if (primaryInFeatured) categories.primaryInFeatured.push(song)
    if (primaryInWriters) categories.primaryInWriters.push(song)
    if (featuredInWriters) categories.featuredInWriters.push(song)
  }

  // Print summary
  console.log('=== Category Distribution (sample of 100) ===\n')
  console.log(
    `Clear Solo (1 primary, 0 featured): ${categories.clearSolo.length}`,
  )
  console.log(
    `Clear Collab (1 primary, 1+ featured): ${categories.clearCollab.length}`,
  )
  console.log(`Multi-Primary (2+ primary): ${categories.multiPrimary.length}`)
  console.log('')

  console.log('=== Edge Cases (roles overlap) ===\n')
  console.log(
    `Primary also in Featured: ${categories.primaryInFeatured.length}`,
  )
  console.log(`Primary also in Writers: ${categories.primaryInWriters.length}`)
  console.log(
    `Featured also in Writers: ${categories.featuredInWriters.length}`,
  )
  console.log('')

  // Deep dive into edge cases
  if (categories.primaryInFeatured.length > 0) {
    console.log('=== Example: Primary in Featured ===')
    const example = categories.primaryInFeatured[0]
    console.log(`Song: "${example.title}" (id: ${example.id})`)
    console.log(
      `  Primary Artists: ${example.primaryArtists.map((a) => a.name).join(', ')}`,
    )
    console.log(
      `  Featured Artists: ${example.featuredArtists.map((a) => a.name).join(', ')}`,
    )
    console.log('')
  }

  if (categories.multiPrimary.length > 0) {
    console.log('=== Examples: Multi-Primary Artists ===')
    for (const song of categories.multiPrimary.slice(0, 3)) {
      console.log(`Song: "${song.title}" (id: ${song.id})`)
      console.log(`  primaryArtist (FK): ${song.primaryArtist.name}`)
      console.log(
        `  primaryArtists (M2M): ${song.primaryArtists.map((a) => a.name).join(', ')}`,
      )
      console.log(
        `  featuredArtists: ${song.featuredArtists.map((a) => a.name).join(', ') || '(none)'}`,
      )
      console.log('')
    }
  }

  // Examine title patterns for solo detection
  console.log('=== Title Pattern Analysis ===\n')
  const withFeatInTitle = songs.filter(
    (s) =>
      s.title.toLowerCase().includes('feat') ||
      s.title.toLowerCase().includes('ft.'),
  )
  const withFeatInTitleButNoFeaturedArtists = withFeatInTitle.filter(
    (s) => s.featuredArtists.length === 0,
  )
  console.log(`Songs with "feat"/"ft." in title: ${withFeatInTitle.length}`)
  console.log(
    `  ...but 0 featuredArtists in DB: ${withFeatInTitleButNoFeaturedArtists.length}`,
  )

  if (withFeatInTitleButNoFeaturedArtists.length > 0) {
    console.log('\n  Examples:')
    for (const s of withFeatInTitleButNoFeaturedArtists.slice(0, 3)) {
      console.log(`    - "${s.title}" (id: ${s.id})`)
    }
  }

  // Check artistNames field vs relations
  console.log('\n=== artistNames Field Analysis ===\n')
  const artistNamesMismatch = songs.filter((s) => {
    const allRelatedNames = [
      ...s.primaryArtists.map((a) => a.name),
      ...s.featuredArtists.map((a) => a.name),
    ]
    // Check if artistNames contains names not in relations
    const artistNamesLower = s.artistNames.toLowerCase()
    const allRelatedNamesJoined = allRelatedNames.join(' ').toLowerCase()
    // Simple heuristic: if artistNames has more content
    return artistNamesLower.length > allRelatedNamesJoined.length + 20
  })
  console.log(
    `Songs where artistNames may have extra names: ${artistNamesMismatch.length}`,
  )
  if (artistNamesMismatch.length > 0) {
    for (const s of artistNamesMismatch.slice(0, 3)) {
      console.log(`  Song: "${s.title}"`)
      console.log(`    artistNames: "${s.artistNames}"`)
      console.log(
        `    primaryArtists: ${s.primaryArtists.map((a) => a.name).join(', ')}`,
      )
      console.log(
        `    featuredArtists: ${s.featuredArtists.map((a) => a.name).join(', ') || '(none)'}`,
      )
    }
  }

  await db.$disconnect()
}

exploreSoloLogic().catch((err) => {
  console.error('❌ Exploration failed:', err)
  process.exit(1)
})
