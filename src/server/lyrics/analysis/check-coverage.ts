import { db } from '@/server/prisma'

export async function checkAnalysisCoverage() {
  /**
   * checks to see how many songs of the total songs are analyzed
   */
  const allSongs = await db.song.findMany({
    include: {
      analysis: true,
    },
  })
  console.log('total songs', allSongs.length)

  // Count songs where the analysis relation itself is missing
  const songsWithoutAnalysis = allSongs.filter((song) => !song.analysis)

  console.log('songs without any analysis record', songsWithoutAnalysis.length)
  type Insights = {
    features: number
    freestyles: number
    wordCount: number
    suspiciousTitles: number
    duplicates: number
  }
  const reducedInsights = allSongs.reduce<Insights>(
    (acc, song) => {
      if (song.analysis?.hasFeatures == null) acc.features++
      if (song.analysis?.isFreestyle == null) acc.freestyles++
      if (song.analysis?.wordCount == null) acc.wordCount++
      if (song.analysis?.hasSuspiciousTitle == null) acc.suspiciousTitles++
      if (song.analysis?.isDuplicate == null) acc.duplicates++
      return acc
    },
    {
      features: 0,
      freestyles: 0,
      wordCount: 0,
      suspiciousTitles: 0,
      duplicates: 0,
    },
  )
  console.table(reducedInsights)
}
