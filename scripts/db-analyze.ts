#!/usr/bin/env node

/**
 * Exploratory statistical analysis of the Citadel database.
 * Usage: pnpm db:analyze
 */

import { db } from '@/server/prisma'
import * as fs from 'fs'
import * as path from 'path'

interface Stats {
  total: number
  withLyrics: number
  withMetadata: number
  instrumental: number
  explicit: number | null
  byLanguage: Record<string, number>
  byYear: Record<number, number>
  byLyricsState: Record<string, number>
  avgAnnotationCount: number
  hotSongs: number
  withAlbum: number
  withFeaturedArtists: number
  withWriterArtists: number
  avgLyricsLength: number
  lyricsLengthDistribution: { min: number; max: number; median: number }
}

async function analyzeSongs(): Promise<Stats> {
  const songs = await db.song.findMany({
    include: {
      featuredArtists: true,
      writerArtists: true,
    },
  })

  const withLyrics = songs.filter((s) => s.lyrics && s.lyrics.length > 0)
  const withMetadata = songs.filter((s) => s.metadataFetchedAt !== null)
  const instrumental = songs.filter((s) => s.instrumental)
  const explicit = songs.filter((s) => s.explicit === true)
  const hotSongs = songs.filter((s) => s.statsHot)
  const withAlbum = songs.filter((s) => s.albumId !== null)
  const withFeaturedArtists = songs.filter((s) => s.featuredArtists.length > 0)
  const withWriterArtists = songs.filter((s) => s.writerArtists.length > 0)

  // Language distribution
  const byLanguage: Record<string, number> = {}
  for (const song of songs) {
    const lang = song.language || 'unknown'
    byLanguage[lang] = (byLanguage[lang] || 0) + 1
  }

  // Year distribution
  const byYear: Record<number, number> = {}
  for (const song of songs) {
    if (song.releaseDateYear) {
      byYear[song.releaseDateYear] = (byYear[song.releaseDateYear] || 0) + 1
    }
  }

  // Lyrics state distribution
  const byLyricsState: Record<string, number> = {}
  for (const song of songs) {
    byLyricsState[song.lyricsState] = (byLyricsState[song.lyricsState] || 0) + 1
  }

  // Average annotation count
  const avgAnnotationCount =
    songs.reduce((sum, s) => sum + s.annotationCount, 0) / songs.length

  // Lyrics length analysis
  const lyricsLengths = withLyrics
    .map((s) => s.lyrics!.length)
    .sort((a, b) => a - b)

  const avgLyricsLength =
    lyricsLengths.length > 0
      ? lyricsLengths.reduce((a, b) => a + b, 0) / lyricsLengths.length
      : 0

  const lyricsLengthDistribution = {
    min: lyricsLengths[0] || 0,
    max: lyricsLengths[lyricsLengths.length - 1] || 0,
    median: lyricsLengths[Math.floor(lyricsLengths.length / 2)] || 0,
  }

  return {
    total: songs.length,
    withLyrics: withLyrics.length,
    withMetadata: withMetadata.length,
    instrumental: instrumental.length,
    explicit: explicit.length,
    byLanguage,
    byYear,
    byLyricsState,
    avgAnnotationCount,
    hotSongs: hotSongs.length,
    withAlbum: withAlbum.length,
    withFeaturedArtists: withFeaturedArtists.length,
    withWriterArtists: withWriterArtists.length,
    avgLyricsLength,
    lyricsLengthDistribution,
  }
}

async function analyzeArtists() {
  const artists = await db.artist.findMany({
    include: {
      _count: {
        select: {
          songsPrimary: true,
          songsFeatured: true,
          songsWriter: true,
          albumsPrimary: true,
        },
      },
    },
  })

  const verified = artists.filter((a) => a.isVerified)
  const memeVerified = artists.filter((a) => a.isMemeVerified)

  // Top artists by song count
  const topByPrimarySongs = [...artists]
    .sort((a, b) => b._count.songsPrimary - a._count.songsPrimary)
    .slice(0, 10)

  const topByFeatured = [...artists]
    .sort((a, b) => b._count.songsFeatured - a._count.songsFeatured)
    .slice(0, 10)

  return {
    total: artists.length,
    verified: verified.length,
    memeVerified: memeVerified.length,
    topByPrimarySongs,
    topByFeatured,
  }
}

async function analyzeAlbums() {
  const albums = await db.album.findMany({
    include: {
      _count: {
        select: {
          songsMain: true,
        },
      },
    },
  })

  // Year distribution
  const byYear: Record<number, number> = {}
  for (const album of albums) {
    if (album.releaseDateYear) {
      byYear[album.releaseDateYear] = (byYear[album.releaseDateYear] || 0) + 1
    }
  }

  // Top albums by song count
  const topBySongCount = [...albums]
    .sort((a, b) => b._count.songsMain - a._count.songsMain)
    .slice(0, 10)

  return {
    total: albums.length,
    byYear,
    topBySongCount,
  }
}

async function analyzeCollaborations() {
  const songs = await db.song.findMany({
    include: {
      primaryArtists: true,
      featuredArtists: true,
      writerArtists: true,
    },
  })

  // Solo vs collaboration analysis
  const solo = songs.filter(
    (s) => s.primaryArtists.length === 1 && s.featuredArtists.length === 0,
  )

  const withFeatures = songs.filter((s) => s.featuredArtists.length > 0)
  const multiPrimary = songs.filter((s) => s.primaryArtists.length > 1)

  // Feature count distribution
  const featureCountDist: Record<number, number> = {}
  for (const song of songs) {
    const count = song.featuredArtists.length
    featureCountDist[count] = (featureCountDist[count] || 0) + 1
  }

  // Writer count distribution
  const writerCountDist: Record<number, number> = {}
  for (const song of songs) {
    const count = song.writerArtists.length
    writerCountDist[count] = (writerCountDist[count] || 0) + 1
  }

  return {
    soloSongs: solo.length,
    withFeatures: withFeatures.length,
    multiPrimary: multiPrimary.length,
    featureCountDist,
    writerCountDist,
  }
}

function generateMarkdown(
  songStats: Stats,
  artistStats: Awaited<ReturnType<typeof analyzeArtists>>,
  albumStats: Awaited<ReturnType<typeof analyzeAlbums>>,
  collabStats: Awaited<ReturnType<typeof analyzeCollaborations>>,
): string {
  const now = new Date().toISOString()

  let md = `# Citadel Database Analysis

> Generated: ${now}

---

## Overview

| Entity | Count |
|--------|-------|
| **Songs** | ${songStats.total} |
| **Artists** | ${artistStats.total} |
| **Albums** | ${albumStats.total} |

---

## Songs

### Data Completeness

| Metric | Count | % |
|--------|-------|---|
| With Lyrics | ${songStats.withLyrics} | ${((songStats.withLyrics / songStats.total) * 100).toFixed(1)}% |
| With Metadata | ${songStats.withMetadata} | ${((songStats.withMetadata / songStats.total) * 100).toFixed(1)}% |
| With Album | ${songStats.withAlbum} | ${((songStats.withAlbum / songStats.total) * 100).toFixed(1)}% |
| With Featured Artists | ${songStats.withFeaturedArtists} | ${((songStats.withFeaturedArtists / songStats.total) * 100).toFixed(1)}% |
| With Writer Credits | ${songStats.withWriterArtists} | ${((songStats.withWriterArtists / songStats.total) * 100).toFixed(1)}% |

### Content Classification

| Type | Count | % |
|------|-------|---|
| Instrumental | ${songStats.instrumental} | ${((songStats.instrumental / songStats.total) * 100).toFixed(1)}% |
| Explicit | ${songStats.explicit} | ${((songStats.explicit! / songStats.total) * 100).toFixed(1)}% |
| Hot (Trending) | ${songStats.hotSongs} | ${((songStats.hotSongs / songStats.total) * 100).toFixed(1)}% |

### Lyrics Stats

| Metric | Value |
|--------|-------|
| Avg Length | ${Math.round(songStats.avgLyricsLength).toLocaleString()} chars |
| Min Length | ${songStats.lyricsLengthDistribution.min.toLocaleString()} chars |
| Max Length | ${songStats.lyricsLengthDistribution.max.toLocaleString()} chars |
| Median Length | ${songStats.lyricsLengthDistribution.median.toLocaleString()} chars |
| Avg Annotations | ${songStats.avgAnnotationCount.toFixed(1)} |

### Language Distribution

| Language | Count | % |
|----------|-------|---|
${Object.entries(songStats.byLanguage)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([lang, count]) =>
      `| ${lang} | ${count} | ${((count / songStats.total) * 100).toFixed(1)}% |`,
  )
  .join('\n')}

### Lyrics State

| State | Count | % |
|-------|-------|---|
${Object.entries(songStats.byLyricsState)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([state, count]) =>
      `| ${state} | ${count} | ${((count / songStats.total) * 100).toFixed(1)}% |`,
  )
  .join('\n')}

### Release Year Distribution

| Year | Count |
|------|-------|
${Object.entries(songStats.byYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .slice(0, 15)
  .map(([year, count]) => `| ${year} | ${count} |`)
  .join('\n')}

---

## Collaborations

### Solo vs Features

| Type | Count | % |
|------|-------|---|
| Solo Songs | ${collabStats.soloSongs} | ${((collabStats.soloSongs / songStats.total) * 100).toFixed(1)}% |
| With Features | ${collabStats.withFeatures} | ${((collabStats.withFeatures / songStats.total) * 100).toFixed(1)}% |
| Multi-Primary Artist | ${collabStats.multiPrimary} | ${((collabStats.multiPrimary / songStats.total) * 100).toFixed(1)}% |

### Featured Artists per Song

| # Features | Songs |
|------------|-------|
${Object.entries(collabStats.featureCountDist)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([count, songs]) => `| ${count} | ${songs} |`)
  .join('\n')}

### Writers per Song

| # Writers | Songs |
|-----------|-------|
${Object.entries(collabStats.writerCountDist)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .slice(0, 10)
  .map(([count, songs]) => `| ${count} | ${songs} |`)
  .join('\n')}

---

## Artists

| Metric | Count |
|--------|-------|
| Total | ${artistStats.total} |
| Verified | ${artistStats.verified} |
| Meme Verified | ${artistStats.memeVerified} |

### Top Artists by Song Count (Primary)

| Artist | Songs |
|--------|-------|
${artistStats.topByPrimarySongs.map((a) => `| ${a.name} | ${a._count.songsPrimary} |`).join('\n')}

### Top Artists by Feature Count

| Artist | Features |
|--------|----------|
${artistStats.topByFeatured.map((a) => `| ${a.name} | ${a._count.songsFeatured} |`).join('\n')}

---

## Albums

| Metric | Count |
|--------|-------|
| Total | ${albumStats.total} |

### Albums by Year (Recent)

| Year | Count |
|------|-------|
${Object.entries(albumStats.byYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .slice(0, 10)
  .map(([year, count]) => `| ${year} | ${count} |`)
  .join('\n')}

### Top Albums by Songs

| Album | Songs |
|-------|-------|
${albumStats.topBySongCount.map((a) => `| ${a.name} | ${a._count.songsMain} |`).join('\n')}

---

*Analysis complete.*
`

  return md
}

async function main() {
  console.log('🔍 Analyzing database...\n')

  const [songStats, artistStats, albumStats, collabStats] = await Promise.all([
    analyzeSongs(),
    analyzeArtists(),
    analyzeAlbums(),
    analyzeCollaborations(),
  ])

  const markdown = generateMarkdown(
    songStats,
    artistStats,
    albumStats,
    collabStats,
  )

  // Output to console
  console.log(markdown)

  // Save to file
  const outputPath = path.join(process.cwd(), 'data', 'db-analysis.md')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, markdown)
  console.log(`\n📄 Saved to: ${outputPath}`)

  await db.$disconnect()
}

main().catch((err) => {
  console.error('❌ Analysis failed:', err)
  process.exit(1)
})
