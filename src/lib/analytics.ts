import type { Session } from '../types/poker'

export type PlayerAggregate = {
  name: string
  totalPaid: number
  totalChipValue: number
  totalProfit: number
  sessionsPlayed: number
  averageProfit: number
  averagePaid: number
  bestSessionProfit: number
  worstSessionProfit: number
  roi: number
}

export type SessionAggregate = {
  id: string
  label: string
  playerCount: number
  totalPaid: number
  totalChipValue: number
  totalProfit: number
}

export type SeasonSummary = {
  totalPaid: number
  totalChipValue: number
  totalProfit: number
  totalEntries: number
  uniquePlayers: number
  totalRoi: number
  averageTableSize: number
  bestSession: SessionAggregate | null
  latestSession: SessionAggregate | null
}

export const formatCurrency = (value: number) => `$${value.toFixed(2)}`
export const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export const buildPlayerAggregates = (sessions: Session[]): PlayerAggregate[] => {
  const totals = new Map<string, PlayerAggregate & { sessionProfits: number[] }>()

  sessions.forEach((session) => {
    Object.values(session.players).forEach((player) => {
      const profit = player.chipValue - player.paid
      const existing = totals.get(player.name) ?? {
        name: player.name,
        totalPaid: 0,
        totalChipValue: 0,
        totalProfit: 0,
        sessionsPlayed: 0,
        averageProfit: 0,
        averagePaid: 0,
        bestSessionProfit: 0,
        worstSessionProfit: 0,
        roi: 0,
        sessionProfits: [],
      }

      const updated = {
        ...existing,
        totalPaid: existing.totalPaid + player.paid,
        totalChipValue: existing.totalChipValue + player.chipValue,
        sessionsPlayed: existing.sessionsPlayed + 1,
        sessionProfits: [...existing.sessionProfits, profit],
      }

      updated.totalProfit = updated.totalChipValue - updated.totalPaid
      totals.set(player.name, updated)
    })
  })

  return Array.from(totals.values()).map((stats) => {
    const bestSessionProfit =
      stats.sessionProfits.length > 0 ? Math.max(...stats.sessionProfits) : 0
    const worstSessionProfit =
      stats.sessionProfits.length > 0 ? Math.min(...stats.sessionProfits) : 0
    const averageProfit =
      stats.sessionsPlayed > 0 ? stats.totalProfit / stats.sessionsPlayed : 0
    const averagePaid =
      stats.sessionsPlayed > 0 ? stats.totalPaid / stats.sessionsPlayed : 0
    const roi = stats.totalPaid > 0 ? stats.totalProfit / stats.totalPaid : 0
    const { sessionProfits, ...rest } = stats

    return {
      ...rest,
      averageProfit,
      averagePaid,
      bestSessionProfit,
      worstSessionProfit,
      roi,
    }
  })
}

export const buildSessionAggregates = (sessions: Session[]): SessionAggregate[] =>
  sessions.map((session) => {
    const players = Object.values(session.players)
    const totalPaid = players.reduce((sum, player) => sum + player.paid, 0)
    const totalChipValue = players.reduce(
      (sum, player) => sum + player.chipValue,
      0,
    )

    return {
      id: session.id,
      label: session.label,
      playerCount: players.length,
      totalPaid,
      totalChipValue,
      totalProfit: totalChipValue - totalPaid,
    }
  })

export const buildSeasonSummary = (sessions: Session[]): SeasonSummary => {
  const players = buildPlayerAggregates(sessions)
  const sessionAggregates = buildSessionAggregates(sessions)
  const totalPaid = players.reduce((sum, player) => sum + player.totalPaid, 0)
  const totalChipValue = players.reduce(
    (sum, player) => sum + player.totalChipValue,
    0,
  )
  const totalProfit = totalChipValue - totalPaid
  const totalEntries = sessions.reduce(
    (sum, session) => sum + Object.keys(session.players).length,
    0,
  )

  return {
    totalPaid,
    totalChipValue,
    totalProfit,
    totalEntries,
    uniquePlayers: players.length,
    totalRoi: totalPaid > 0 ? totalProfit / totalPaid : 0,
    averageTableSize:
      sessions.length > 0 ? totalEntries / Math.max(sessions.length, 1) : 0,
    bestSession: sessionAggregates.reduce<SessionAggregate | null>(
      (winner, session) =>
        !winner || session.totalProfit > winner.totalProfit ? session : winner,
      null,
    ),
    latestSession: sessionAggregates.at(-1) ?? null,
  }
}
