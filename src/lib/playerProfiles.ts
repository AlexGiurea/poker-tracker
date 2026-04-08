import { buildPlayerAggregates } from './analytics'
import type { Session } from '../types/poker'

export type PlayerSessionRow = {
  sessionId: string
  sessionLabel: string
  paid: number
  chipValue: number
  profit: number
  cumulativeProfit: number
}

export type PlayerProfileSnapshot = {
  name: string
  totalProfit: number
  sessionsPlayed: number
  totalPaid: number
  totalChipValue: number
  averageProfit: number
  bestSessionProfit: number
  worstSessionProfit: number
  roi: number
  averagePaid: number
  sessions: PlayerSessionRow[]
}

export const buildPlayerProfile = (
  sessions: Session[],
  name: string,
): PlayerProfileSnapshot | null => {
  const profile = buildPlayerAggregates(sessions).find(
    (player) => player.name === name,
  )

  if (!profile) return null

  let runningProfit = 0

  const sessionRows: PlayerSessionRow[] = sessions.flatMap((session) => {
    const player = Object.values(session.players).find((entry) => entry.name === name)

    if (!player) return []

    const profit = player.chipValue - player.paid
    runningProfit += profit

    return [
      {
        sessionId: session.id,
        sessionLabel: session.label,
        paid: player.paid,
        chipValue: player.chipValue,
        profit,
        cumulativeProfit: runningProfit,
      },
    ]
  })

  return {
    name: profile.name,
    totalProfit: profile.totalProfit,
    sessionsPlayed: profile.sessionsPlayed,
    totalPaid: profile.totalPaid,
    totalChipValue: profile.totalChipValue,
    averageProfit: profile.averageProfit,
    bestSessionProfit: profile.bestSessionProfit,
    worstSessionProfit: profile.worstSessionProfit,
    roi: profile.roi,
    averagePaid: profile.averagePaid,
    sessions: sessionRows,
  }
}
