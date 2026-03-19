import fs from 'node:fs'
import path from 'node:path'

const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 20
const MAX_MESSAGES = 10
const MAX_MESSAGE_CHARS = 500
const MAX_TOTAL_CHARS = 3000
const MAX_OUTPUT_TOKENS = 140
const MODEL_FALLBACK = 'gpt-5.4-mini'

const SYSTEM_PROMPT = `You are the Poker Tracker chatbot.
Answer questions about sessions, players, and statistics from the CSV data included below.
Use short, human, conversational replies.
Prefer 1 to 3 short sentences unless the user explicitly asks for more detail.
Do not use hype, filler, or long lists unless necessary.
If the data is missing, say so plainly and mention what is available.
Do not invent new sessions or players.`

const rateLimitStore = globalThis.__pokerTrackerRateLimitStore ?? new Map()
globalThis.__pokerTrackerRateLimitStore = rateLimitStore

const readCsvContext = () => {
  const csvPath = path.join(process.cwd(), 'public', 'data', 'players-results.csv')
  return fs.readFileSync(csvPath, 'utf8')
}

const json = (res, statusCode, body) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }

  return req.socket?.remoteAddress ?? 'unknown'
}

const isAllowedOrigin = (req) => {
  const origin = req.headers.origin
  if (!origin) return true

  const host = req.headers.host
  const allowedOrigins = [
    host ? `https://${host}` : null,
    host ? `http://${host}` : null,
    process.env.ALLOWED_ORIGIN ?? null,
  ].filter(Boolean)

  return allowedOrigins.includes(origin)
}

const applyRateLimit = (ip) => {
  const now = Date.now()

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.startedAt > WINDOW_MS) {
      rateLimitStore.delete(key)
    }
  }

  const current = rateLimitStore.get(ip)
  if (!current || now - current.startedAt > WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, startedAt: now })
    return { allowed: true }
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000),
    }
  }

  current.count += 1
  rateLimitStore.set(ip, current)
  return { allowed: true }
}

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return []

  let totalChars = 0

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string',
    )
    .slice(-MAX_MESSAGES)
    .map((message) => {
      const trimmed = message.content.trim().slice(0, MAX_MESSAGE_CHARS)
      const remaining = Math.max(0, MAX_TOTAL_CHARS - totalChars)
      const content = trimmed.slice(0, remaining)
      totalChars += content.length
      return {
        role: message.role,
        content,
      }
    })
    .filter((message) => message.content.length > 0)
}

const extractResponseText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const textParts =
    payload?.output?.flatMap((item) =>
      (item.content ?? []).map((part) => {
        if (typeof part.text === 'string' && part.text.trim()) {
          return part.text.trim()
        }

        if (typeof part.refusal === 'string' && part.refusal.trim()) {
          return part.refusal.trim()
        }

        return ''
      }),
    ) ?? []

  return textParts.find((text) => text.length > 0) ?? ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' })
  }

  if (!isAllowedOrigin(req)) {
    return json(res, 403, { error: 'Forbidden origin.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return json(res, 500, { error: 'Missing server OpenAI API key.' })
  }

  const limit = applyRateLimit(getClientIp(req))
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds))
    return json(res, 429, {
      error: 'Too many chat requests. Please wait a few minutes and try again.',
    })
  }

  const body =
    typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body ?? {}

  const messages = sanitizeMessages(body.messages)
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')

  if (!lastUserMessage) {
    return json(res, 400, { error: 'Missing user message.' })
  }

  try {
    const csvContext = readCsvContext()
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? MODEL_FALLBACK,
        instructions: `${SYSTEM_PROMPT}\n\nCSV data (header + rows):\n${csvContext}`,
        input: messages,
        max_output_tokens: MAX_OUTPUT_TOKENS,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      return json(res, response.status, {
        error: payload?.error?.message ?? 'Chat request failed.',
      })
    }

    const outputText = extractResponseText(payload)
    if (!outputText) {
      return json(res, 502, {
        error: 'The model returned no text response.',
      })
    }

    return json(res, 200, { outputText })
  } catch (error) {
    return json(res, 500, {
      error:
        error instanceof Error ? error.message : 'Unexpected chat server error.',
    })
  }
}
