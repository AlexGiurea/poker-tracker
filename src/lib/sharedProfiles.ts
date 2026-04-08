import { decompressFromEncodedURIComponent } from 'lz-string'
import type { Session } from '../types/poker'
import { buildPlayerProfile, type PlayerProfileSnapshot } from './playerProfiles'

type SharedSessionEntry = [label: string, paidCents: number, chipValueCents: number]

type SharedProfilePayload = {
  version: 1
  name: string
  sessions: SharedSessionEntry[]
}

const SHARED_PROFILE_PARAM = 's'
const SHARED_PROFILE_PATH_PREFIX = '/p/'

const fromCents = (value: number) => value / 100

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
  const slug = encodeURIComponent(toPlayerSlug(snapshot.name))
  return new URL(`${SHARED_PROFILE_PATH_PREFIX}${slug}`, window.location.origin).toString()
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

export const toPlayerSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const getSharedPathSlug = (pathname: string) => {
  if (!pathname.startsWith(SHARED_PROFILE_PATH_PREFIX)) {
    return null
  }

  const rawSlug = pathname.slice(SHARED_PROFILE_PATH_PREFIX.length).split('/')[0]
  return rawSlug ? decodeURIComponent(rawSlug) : null
}

const findPlayerNameBySlug = (sessions: Session[], slug: string) => {
  const uniqueNames = [
    ...new Set(
      sessions.flatMap((session) =>
        Object.values(session.players).map((player) => player.name),
      ),
    ),
  ]

  return uniqueNames.find((name) => toPlayerSlug(name) === slug) ?? null
}

export const resolveSharedProfile = (
  pathname: string,
  search: string,
  sessions: Session[],
) => {
  const pathSlug = getSharedPathSlug(pathname)

  if (pathSlug) {
    const playerName = findPlayerNameBySlug(sessions, pathSlug)
    return {
      isSharedRoute: true,
      profile: playerName ? buildPlayerProfile(sessions, playerName) : null,
    }
  }

  const sharedProfile = readSharedProfileFromSearch(search)
  return {
    isSharedRoute: Boolean(sharedProfile),
    profile: sharedProfile,
  }
}
