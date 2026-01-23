import { markDuplicates } from './mark-duplicates'
import { markWordCount } from './mark-word-count'
import { markSuspiciousTitles } from './mark-suspicious-titles'
import { markFreestyles } from './mark-freestyles'
import { markFeatures } from './mark-features'
import { checkAnalysisCoverage } from './check-coverage'

export async function runAnalysis() {
  await checkAnalysisCoverage()

  console.log('Marking duplicates...')
  await markDuplicates()

  console.log('Marking word count...')
  await markWordCount()

  console.log('Marking suspicious titles...')
  await markSuspiciousTitles()

  console.log('Marking freestyles...')
  await markFreestyles()

  console.log('Marking features...')
  await markFeatures()

  console.log('Analysis complete. Analysis saved to database.')

  await checkAnalysisCoverage()
}
runAnalysis().then(() => console.log('analysis complete'))
