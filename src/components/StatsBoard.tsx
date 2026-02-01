import { useMemo, useState } from 'react'
import type { Session } from '../types/poker'

type StatsBoardProps = {
  sessions: Session[]
}

type PlayerStats = {
  name: string
  totalPaid: number
  totalChipValue: number
  totalProfit: number
  sessionsPlayed: number
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const buildPlayerStats = (sessions: Session[]) => {
  const totals = new Map<string, PlayerStats>()

  sessions.forEach((session) => {
    Object.values(session.players).forEach((player) => {
      const existing = totals.get(player.name) ?? {
        name: player.name,
        totalPaid: 0,
        totalChipValue: 0,
        totalProfit: 0,
        sessionsPlayed: 0,
      }

      const updated = {
        ...existing,
        totalPaid: existing.totalPaid + player.paid,
        totalChipValue: existing.totalChipValue + player.chipValue,
        sessionsPlayed: existing.sessionsPlayed + 1,
      }

      updated.totalProfit = updated.totalChipValue - updated.totalPaid
      totals.set(player.name, updated)
    })
  })

  return Array.from(totals.values())
}

const pickTop = (
  players: PlayerStats[],
  selector: (stats: PlayerStats) => number,
) =>
  players.reduce<PlayerStats | null>((winner, current) => {
    if (!winner) return current
    return selector(current) > selector(winner) ? current : winner
  }, null)

const StatsBoard = ({ sessions }: StatsBoardProps) => {
  const players = buildPlayerStats(sessions)
  const totalPaid = players.reduce((sum, player) => sum + player.totalPaid, 0)
  const totalChipValue = players.reduce(
    (sum, player) => sum + player.totalChipValue,
    0,
  )
  const totalProfit = totalChipValue - totalPaid
  const totalRoi = totalPaid > 0 ? totalProfit / totalPaid : 0
  const totalEntries = sessions.reduce(
    (sum, session) => sum + Object.keys(session.players).length,
    0,
  )

  const mostProfitable = pickTop(players, (player) => player.totalProfit)
  const mostBuyIns = pickTop(players, (player) => player.totalPaid)
  const mostSessions = pickTop(players, (player) => player.sessionsPlayed)
  const [metric, setMetric] = useState<
    'profit' | 'paid' | 'chipValue' | 'sessions'
  >('profit')
  const metricConfig = useMemo(
    () => ({
      profit: {
        label: 'Profit',
        value: (player: PlayerStats) => player.totalProfit,
        format: (value: number) => formatCurrency(value),
      },
      paid: {
        label: 'Paid',
        value: (player: PlayerStats) => player.totalPaid,
        format: (value: number) => formatCurrency(value),
      },
      chipValue: {
        label: 'Chip value',
        value: (player: PlayerStats) => player.totalChipValue,
        format: (value: number) => formatCurrency(value),
      },
      sessions: {
        label: 'Sessions',
        value: (player: PlayerStats) => player.sessionsPlayed,
        format: (value: number) => String(value),
      },
    }),
    [],
  )
  const metricValues = metricConfig[metric]
  const sortedPlayers = [...players].sort(
    (a, b) => metricValues.value(b) - metricValues.value(a),
  )
  const maxMetricValue = Math.max(
    1,
    ...sortedPlayers.map((player) => metricValues.value(player)),
  )
  const roiPercent = Math.max(0, Math.min(1, totalRoi))
  const roiStroke = 2 * Math.PI * 46
  const roiDash = roiStroke * roiPercent

  return (
    <div className="board">
      <section className="column">
        <div className="column-header">
          <div>
            <h2>Statistics</h2>
            <p>Highlights across all days</p>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-title">Most profitable</p>
            <p className="stat-value">
              {mostProfitable ? formatCurrency(mostProfitable.totalProfit) : '$0.00'}
            </p>
            <p className="stat-meta">{mostProfitable?.name ?? 'No players yet'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Most buy-ins</p>
            <p className="stat-value">
              {mostBuyIns ? formatCurrency(mostBuyIns.totalPaid) : '$0.00'}
            </p>
            <p className="stat-meta">{mostBuyIns?.name ?? 'No players yet'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Most sessions played</p>
            <p className="stat-value">{mostSessions?.sessionsPlayed ?? 0}</p>
            <p className="stat-meta">{mostSessions?.name ?? 'No players yet'}</p>
          </div>
        </div>
      </section>
      <section className="column">
        <div className="column-header">
          <div>
            <h2>Statistics</h2>
            <p>Totals across all days</p>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-title">Total buy-ins</p>
            <p className="stat-value">{formatCurrency(totalPaid)}</p>
            <p className="stat-meta">All sessions combined</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Total chip value</p>
            <p className="stat-value">{formatCurrency(totalChipValue)}</p>
            <p className="stat-meta">All sessions combined</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Total profit</p>
            <p className="stat-value">{formatCurrency(totalProfit)}</p>
            <p className="stat-meta">All sessions combined</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Unique players</p>
            <p className="stat-value">{players.length}</p>
            <p className="stat-meta">Across all days</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Total player entries</p>
            <p className="stat-value">{totalEntries}</p>
            <p className="stat-meta">Day-by-day appearances</p>
          </div>
        </div>
      </section>
      <section className="column">
        <div className="column-header">
          <div>
            <h2>Interactive insights</h2>
            <p>Explore performance by player</p>
          </div>
        </div>
        <div className="stats-interactive">
          <div className="stat-wheel">
            <svg viewBox="0 0 120 120" role="img" aria-label="Total ROI">
              <circle
                className="stat-wheel-track"
                cx="60"
                cy="60"
                r="46"
                fill="none"
                strokeWidth="12"
              />
              <circle
                className="stat-wheel-value"
                cx="60"
                cy="60"
                r="46"
                fill="none"
                strokeWidth="12"
                strokeDasharray={`${roiDash} ${roiStroke - roiDash}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="stat-wheel-label">
              <span>ROI</span>
              <strong>{formatPercent(totalRoi)}</strong>
              <p>Profit vs buy-ins</p>
            </div>
          </div>
          <div className="stat-bars">
            <div className="stat-bar-header">
              <h3>Player leaderboard</h3>
              <div className="stat-toggle">
                {(
                  Object.keys(metricConfig) as Array<keyof typeof metricConfig>
                ).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={metric === key ? 'active' : ''}
                    onClick={() => setMetric(key)}
                  >
                    {metricConfig[key].label}
                  </button>
                ))}
              </div>
            </div>
            {sortedPlayers.length === 0 ? (
              <p className="empty-state">No player stats yet.</p>
            ) : (
              <div className="stat-bar-list">
                {sortedPlayers.map((player) => {
                  const value = metricValues.value(player)
                  const width = Math.max(4, (value / maxMetricValue) * 100)
                  return (
                    <div key={player.name} className="stat-bar-row">
                      <span>{player.name}</span>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="stat-bar-value">
                        {metricValues.format(value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default StatsBoard
