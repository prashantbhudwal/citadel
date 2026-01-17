import { db } from '@/server/prisma'

async function exploreArtistRelations() {
  console.log('🔍 Exploring Artist Relations...\n')

  // Fetch a sample of songs with their relations
  const songs = await db.song.findMany({
    take: 50,
    where: {
      // Get a mix of songs that might have features
      OR: [
        { featuredArtists: { some: {} } }, // Has features (relation)
        { primaryArtists: { some: {} } }, // Has primary artists (relation)
      ],
    },
    include: {
      primaryArtists: true,
      featuredArtists: true,
    },
    orderBy: { id: 'asc' },
  })

  let stats = {
    total: songs.length,
    hasFeaturedRelation: 0,
    hasMultiplePrimary: 0,
    hasSinglePrimaryOnly: 0, // True solo
  }

  const samples: any[] = []

  for (const song of songs) {
    const featuredCount = song.featuredArtists.length
    const primaryCount = song.primaryArtists.length
    const isSolo = primaryCount === 1 && featuredCount === 0

    if (featuredCount > 0) stats.hasFeaturedRelation++
    if (primaryCount > 1) stats.hasMultiplePrimary++
    if (isSolo) stats.hasSinglePrimaryOnly++

    samples.push({
      id: song.id,
      title: song.title,
      fullTitle: song.fullTitle,
      primaryCount,
      featuredCount,
      primaryNames: song.primaryArtists.map((a) => a.name).join(', '),
      featuredNames: song.featuredArtists.map((a) => a.name).join(', '),
      isSolo,
    })
  }

  // Generate Markdown Report
  console.log('# Artist Relation Exploration Report\n')

  console.log('## Statistics (Sample Size: ' + stats.total + ')\n')
  console.log(
    `- **Has Featured Artists (Relation):** ${stats.hasFeaturedRelation}`,
  )
  console.log(`- **Has Multiple Primary Artists:** ${stats.hasMultiplePrimary}`)
  console.log(
    `- **True Solo (1 Primary, 0 Featured):** ${stats.hasSinglePrimaryOnly}`,
  )

  console.log('\n## Samples\n')
  console.log('| ID | Title | Primary | Featured | Is Solo? |')
  console.log('|---|---|---|---|---|')

  samples.slice(0, 20).forEach((s) => {
    const primary = s.primaryNames || '*(None)*'
    const featured = s.featuredNames || '*(None)*'
    const soloMark = s.isSolo ? '✅' : '❌'
    console.log(
      `| ${s.id} | ${s.title.substring(0, 30)} | ${primary} | ${featured} | ${soloMark} |`,
    )
  })

  console.log('\n## Edge Cases & Notes')
  const multiPrimary = samples.find((s) => s.primaryCount > 1)
  if (multiPrimary) {
    console.log(`\n**Example of Multiple Primary Artists:**`)
    console.log(`- "${multiPrimary.title}" by ${multiPrimary.primaryNames}`)
  }

  const complexFeature = samples.find((s) => s.featuredCount > 1)
  if (complexFeature) {
    console.log(`\n**Example of Multiple Featured Artists:**`)
    console.log(
      `- "${complexFeature.title}" feat. ${complexFeature.featuredNames}`,
    )
  }
}

exploreArtistRelations()
  .catch(console.error)
  .finally(() => db.$disconnect())
