import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const sourceUrl = pathToFileURL(resolve('src/data/sessionRecords.ts')).href
const { playersResultsCsv } = await import(sourceUrl)

const target = resolve('public/data/players-results.csv')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, playersResultsCsv + '\n', 'utf8')
console.log(`Wrote ${target} (${playersResultsCsv.split('\n').length} lines)`)
