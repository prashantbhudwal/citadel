#!/usr/bin/env node

import { db } from '@/server/prisma'

async function main() {
  console.log(
    '📊 Generating Lyrics Word Count Distribution (Bucket size: 50)...\n',
  )

  const songs = await db.song.findMany({
    where: { lyrics: { not: null } },
    select: { title: true, lyrics: true },
  })

  // Calculate word counts
  const counts = songs.map((s) => s.lyrics!.trim().split(/\s+/).length)

  // Find max for bucketing
  const maxCount = Math.max(...counts)
  const bucketSize = 50

  // Group into buckets
  const distribution: Record<number, number> = {}

  for (const count of counts) {
    const bucket = Math.floor(count / bucketSize) * bucketSize
    distribution[bucket] = (distribution[bucket] || 0) + 1
  }

  // Print distribution table
  console.log('| Word Count Range | Number of Songs |')
  console.log('|---|---|')

  // Sort buckets and print
  const buckets = Object.keys(distribution)
    .map(Number)
    .sort((a, b) => a - b)

  for (const bucket of buckets) {
    const nextBucket = bucket + bucketSize
    console.log(`| ${bucket} - ${nextBucket} | ${distribution[bucket]} |`)
  }

  // Statistics
  const total = counts.reduce((a, b) => a + b, 0)
  const avg = total / counts.length
  counts.sort((a, b) => a - b)
  const median = counts[Math.floor(counts.length / 2)]

  console.log('\n--- Summary Statistics ---')
  console.log(`Total Songs: ${songs.length}`)
  console.log(`Average Length: ${Math.round(avg)} words`)
  console.log(`Median Length: ${median} words`)
  console.log(`Min: ${counts[0]} words`)
  console.log(`Max: ${counts[counts.length - 1]} words`)
}

main().catch(console.error)
