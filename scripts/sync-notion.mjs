// Daily sync: read the Notion "Poker Tracker App" page, detect any new
// "## Session N" blocks, ask OpenAI to parse the freeform text into
// structured player rows, and append them to src/data/sessionRecords.ts.
//
// Required env: NOTION_TOKEN, NOTION_PAGE_ID, OPENAI_API_KEY
// Optional env: DRY_RUN=1   (parse + log diff, do not write files)

import { Client as NotionClient } from '@notionhq/client'
import OpenAI from 'openai'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DRY_RUN = process.env.DRY_RUN === '1'
const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!NOTION_TOKEN || !NOTION_PAGE_ID || !OPENAI_API_KEY) {
  console.error('Missing required env: NOTION_TOKEN, NOTION_PAGE_ID, OPENAI_API_KEY')
  process.exit(1)
}

const notion = new NotionClient({ auth: NOTION_TOKEN })
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// ---------- 1. Fetch Notion page text ----------

const inlineText = (richText) => richText.map((rt) => rt.plain_text ?? '').join('')

const fetchPageBlocks = async (pageId) => {
  const blocks = []
  let cursor
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

// Group blocks into sessions keyed by "## Session N" headings.
const groupSessions = (blocks) => {
  const sessions = new Map() // sessionNumber -> { headingIdx, lines[] }
  let current = null
  for (const block of blocks) {
    if (block.type === 'heading_2') {
      const txt = inlineText(block.heading_2.rich_text).trim()
      const m = /^session\s+(\d+)\s*$/i.exec(txt)
      if (m) {
        const n = Number(m[1])
        current = { number: n, lines: [] }
        sessions.set(n, current)
        continue
      }
    }
    if (!current) continue
    if (block.type === 'paragraph') {
      const txt = inlineText(block.paragraph.rich_text)
      if (txt.trim()) current.lines.push(txt)
    }
  }
  return sessions
}

// ---------- 2. Read existing sessions from sessionRecords.ts ----------

const sessionRecordsPath = resolve('src/data/sessionRecords.ts')
const sessionRecordsSource = readFileSync(sessionRecordsPath, 'utf8')
const { sessionRecords } = await import(pathToFileURL(sessionRecordsPath).href)

const existingNumbers = new Set(
  sessionRecords
    .map((s) => /^Day\s+(\d+)$/i.exec(s.label)?.[1])
    .filter(Boolean)
    .map(Number),
)
const lastSession = sessionRecords[sessionRecords.length - 1]
const lastDate = lastSession ? new Date(lastSession.date) : new Date()

// ---------- 3. Diff ----------

const allBlocks = await fetchPageBlocks(NOTION_PAGE_ID)
const notionSessions = groupSessions(allBlocks)
const newSessionNumbers = [...notionSessions.keys()]
  .filter((n) => !existingNumbers.has(n))
  .sort((a, b) => a - b)

console.log(`Existing sessions: ${existingNumbers.size}. Notion sessions: ${notionSessions.size}.`)
console.log(`New sessions to ingest: ${newSessionNumbers.join(', ') || '(none)'}`)

if (newSessionNumbers.length === 0) {
  console.log('Nothing to do.')
  process.exit(0)
}

// ---------- 4. Parse each new session via OpenAI ----------

const PARSE_SYSTEM_PROMPT = `You convert freeform poker-night notes into strict JSON.

Each line in the input describes one player using one of these forms:
- "Name: paid X has Y = Z"           -> paid=X, chipValue=Y
- "Name: X - Y = Z"                  -> paid=Y, chipValue=X
- "Name: X - Y" or "Name: X-Y"       -> paid=Y, chipValue=X
- "Name: -X" or "Name= -X"           -> player only paid the $6 buy-in: paid=6, chipValue=6-X
- "Name: +X" or "Name: X profit"     -> paid=6, chipValue=6+X
- "Name: X" alone (single positive number)  -> paid=6, chipValue=X
- "Name:" with no value              -> SKIP that player entirely

Profit is always chipValue - paid. The numeric "6" is the standard $6 buy-in.

Return ONLY a JSON object: {"players":[{"name": string, "paid": number, "chipValue": number}, ...]}.
Do not include comments, explanations, or markdown fences.`

const parseSessionWithOpenAI = async (lines) => {
  const userText = lines.join('\n')
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0,
    messages: [
      { role: 'system', content: PARSE_SYSTEM_PROMPT },
      { role: 'user', content: userText },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)
  if (!parsed || !Array.isArray(parsed.players)) {
    throw new Error(`Bad OpenAI response: ${raw}`)
  }
  for (const p of parsed.players) {
    if (typeof p.name !== 'string' || typeof p.paid !== 'number' || typeof p.chipValue !== 'number') {
      throw new Error(`Bad player row: ${JSON.stringify(p)}`)
    }
  }
  return parsed.players
}

const addDays = (date, n) => {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const newRecords = []
let cursorDate = lastDate
for (const n of newSessionNumbers) {
  const ses = notionSessions.get(n)
  if (!ses || ses.lines.length === 0) {
    console.warn(`Session ${n} has no body lines, skipping.`)
    continue
  }
  const players = await parseSessionWithOpenAI(ses.lines)
  cursorDate = new Date(addDays(cursorDate, 7))
  const record = {
    id: `day-${n}`,
    label: `Day ${n}`,
    date: cursorDate.toISOString().slice(0, 10),
    notes: '',
    players,
  }
  newRecords.push(record)
  console.log(`Parsed Session ${n}: ${players.length} players on ${record.date}`)
}

if (newRecords.length === 0) {
  console.log('Nothing parsed; exiting.')
  process.exit(0)
}

// ---------- 5. Append to sessionRecords.ts ----------

const formatPlayer = (p) =>
  `      { name: ${JSON.stringify(p.name)}, paid: ${p.paid}, chipValue: ${p.chipValue} },`

const formatRecord = (r) =>
  `  {\n    id: '${r.id}',\n    label: '${r.label}',\n    date: '${r.date}',\n    notes: '',\n    players: [\n${r.players.map(formatPlayer).join('\n')}\n    ],\n  },`

const insertion = newRecords.map(formatRecord).join('\n')

// Append before the closing "]" of `export const sessionRecords`.
const closeMarker = '\n]\n\nexport const seedData'
const idx = sessionRecordsSource.indexOf(closeMarker)
if (idx === -1) {
  throw new Error('Could not find sessionRecords closing marker in TS file')
}
const updated =
  sessionRecordsSource.slice(0, idx) +
  '\n' +
  insertion +
  sessionRecordsSource.slice(idx)

if (DRY_RUN) {
  console.log('--- DRY RUN: would append ---')
  console.log(insertion)
  process.exit(0)
}

writeFileSync(sessionRecordsPath, updated, 'utf8')
console.log(`Appended ${newRecords.length} session(s) to ${sessionRecordsPath}`)
