import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { PlayerProfileSnapshot } from './playerProfiles'

type SharedSessionEntry = [label: string, paidCents: number, chipValueCents: number]

type SharedProfilePayload = {
  version: 1
  name: string
  sessions: SharedSessionEntry[]
}

const SHARED_PROFILE_PARAM = 's'

const toCents = (value: number) => Math.round(value * 100)
const fromCents = (value: number) => value / 100

const toCompactPayload = (
  snapshot: PlayerProfileSnapshot,
): SharedProfilePayload => ({
  version: 1,
  name: snapshot.name,
  sessions: snapshot.sessions.map((session) => [
    session.sessionLabel,
    toCents(session.paid),
    toCents(session.chipValue),
  ]),
})

const toSnapshot = (payload: SharedProfilePayload): PlayerProfileSnapshot => {
  let runningProfit = 0

  const sessions = payload.sessions.map(([sessionLabel, paidCents, chipValueCents], index) => {
    const paid = fromCents(paidCents)
    const chipValue = fromCents(chipValueCents)
    const profit = chipValue - paid
    runningProfit += profit

    return {
      sessionId: `shared-${index + 1}`,
      sessionLabel,
      paid,
      chipValue,
      profit,
      cumulativeProfit: runningProfit,
    }
  })

  const totalPaid = sessions.reduce((sum, session) => sum + session.paid, 0)
  const totalChipValue = sessions.reduce((sum, session) => sum + session.chipValue, 0)
  const totalProfit = totalChipValue - totalPaid
  const sessionsPlayed = sessions.length
  const averageProfit = sessionsPlayed > 0 ? totalProfit / sessionsPlayed : 0
  const averagePaid = sessionsPlayed > 0 ? totalPaid / sessionsPlayed : 0
  const bestSessionProfit = sessionsPlayed > 0
    ? Math.max(...sessions.map((session) => session.profit))
    : 0
  const worstSessionProfit = sessionsPlayed > 0
    ? Math.min(...sessions.map((session) => session.profit))
    : 0
  const roi = totalPaid > 0 ? totalProfit / totalPaid : 0

  return {
    name: payload.name,
    totalProfit,
    sessionsPlayed,
    totalPaid,
    totalChipValue,
    averageProfit,
    bestSessionProfit,
    worstSessionProfit,
    roi,
    averagePaid,
    sessions,
  }
}

export const buildSharedProfileUrl = (snapshot: PlayerProfileSnapshot) => {
  const payload = toCompactPayload(snapshot)
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(
    SHARED_PROFILE_PARAM,
    compressToEncodedURIComponent(JSON.stringify(payload)),
  )
  return url.toString()
}

export const readSharedProfileFromSearch = (search: string) => {
  const params = new URLSearchParams(search)
  const encoded = params.get(SHARED_PROFILE_PARAM)

  if (!encoded) return null

  try {
    const decoded = decompressFromEncodedURIComponent(encoded)

    if (!decoded) return null

    const parsed = JSON.parse(decoded) as SharedProfilePayload

    if (parsed.version !== 1 || !parsed.name || !Array.isArray(parsed.sessions)) {
      return null
    }

    return toSnapshot(parsed)
  } catch {
    return null
  }
}
