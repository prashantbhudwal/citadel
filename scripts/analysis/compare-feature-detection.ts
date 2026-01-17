import { db } from '@/server/prisma'

async function compareFeatureDetection() {
  console.log(
    '🔍 Comparing Feature Detection Methods (Relations vs Fuzzy Title)...\n',
  )

  const songs = await db.song.findMany({
    // take: 1000, // Larger sample size for better comparison
    include: {
      primaryArtists: true,
      featuredArtists: true,
    },
    // Filter for songs that likely have features to make the test meaningful
    where: {
      OR: [
        { title: { contains: 'feat' } },
        { title: { contains: 'ft.' } },
        { featuredArtists: { some: {} } },
        { primaryArtists: { some: {} } },
      ],
    },
  })

  let stats = {
    total: songs.length,
    matchesBoth: 0,
    relationOnly: 0,
    fuzzyOnly: 0,
    neither: 0,
  }

  const discrepancies: any[] = []

  // Stricter Regex: matches (feat.), [feat], feat. Artist, ft. Artist
  // Must match word boundary or bracket before, and strict feat/ft/featuring terms
  const FEATURE_REGEX = /([\(\[]|\b)(feat\.?|ft\.?|featuring)(\b|[\)\]])/i

  for (const song of songs) {
    // 1. Logic Check (Relations)
    const hasRelations =
      song.featuredArtists.length > 0 || song.primaryArtists.length > 1

    // 2. Fuzzy Check (Title Parsing)
    // Check both 'title' and 'titleWithFeatured' just in case, but mainly 'title' usually has it if text-based
    const titleHasFeature =
      FEATURE_REGEX.test(song.title) ||
      FEATURE_REGEX.test(song.titleWithFeatured)
    // 3. Fuzzy Check Comparison (REGEX ONLY)
    const hasFuzzyFeature =
      FEATURE_REGEX.test(song.title) ||
      FEATURE_REGEX.test(song.titleWithFeatured)

    if (hasRelations && hasFuzzyFeature) stats.matchesBoth++
    else if (hasRelations && !hasFuzzyFeature) {
      stats.relationOnly++
      discrepancies.push({
        type: 'RELATION_ONLY',
        song,
        reason: 'Database has relations, but title looks clean',
      })
    } else if (!hasRelations && hasFuzzyFeature) {
      stats.fuzzyOnly++
      discrepancies.push({
        type: 'FUZZY_ONLY',
        song,
        reason: 'Title says feat., but DB relations are empty',
      })
    } else stats.neither++
  }

  // Report
  console.log('# Feature Detection Comparison Report\n')
  console.log('## Statistics (Sample Size: ' + stats.total + ')\n')
  console.log(`- **Matches Both:** ${stats.matchesBoth} (Consistent)`)
  console.log(`- **Relation Only (Hidden Features):** ${stats.relationOnly}`)
  console.log(`- **Fuzzy Only (Missed Relations):** ${stats.fuzzyOnly}`)
  console.log(`- **Neither:** ${stats.neither}`)

  console.log('\n## Discrepancy Analysis')

  if (stats.fuzzyOnly > 0) {
    console.log('\n### ⚠️ Fuzzy Only (Potential Data Gaps)')
    console.log(
      'These songs have "feat." in the title but NO structured relations in the DB.',
    )
    console.log(
      'This suggests we NEED hybrid filtering or better data scraping.\n',
    )
    console.log('| ID | Title | TitleWithFeatured | Reason |')
    console.log('|---|---|---|---|')
    discrepancies
      .filter((d) => d.type === 'FUZZY_ONLY')
      .slice(0, 15)
      .forEach((d) => {
        console.log(
          `| ${d.song.id} | ${d.song.title.substring(0, 30)} | ${d.song.titleWithFeatured.substring(0, 30)} | ${d.reason} |`,
        )
      })
  } else {
    console.log('\n### ✅ No "Fuzzy Only" cases found.')
    console.log('Structured relations caught everything that the regex caught.')
  }

  if (stats.relationOnly > 0) {
    console.log('\n### ℹ️ Relation Only (Structured Data Wins)')
    console.log(
      'These have relations but the title string doesn\'t explicitly say "feat".',
    )
    console.log('This shows why structured data is better than just regex.\n')
    console.log('| ID | Title | Primary Artists | Featured Artists |')
    console.log('|---|---|---|---|')
    discrepancies
      .filter((d) => d.type === 'RELATION_ONLY')
      .slice(0, 15)
      .forEach((d) => {
        const prim = d.song.primaryArtists.map((a: any) => a.name).join(', ')
        const feat = d.song.featuredArtists.map((a: any) => a.name).join(', ')
        console.log(
          `| ${d.song.id} | ${d.song.title.substring(0, 30)} | ${prim} | ${feat} |`,
        )
      })
  }
}

compareFeatureDetection()
  .catch(console.error)
  .finally(() => db.$disconnect())
