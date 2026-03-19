import { useState } from 'react'
import type { Session } from '../types/poker'
import {
  buildPlayerAggregates,
  buildSeasonSummary,
  formatCurrency,
  formatPercent,
} from '../lib/analytics'

type StatsBoardProps = {
  sessions: Session[]
}

const pickTop = <T,>(items: T[], selector: (item: T) => number) =>
  items.reduce<T | null>((winner, current) => {
    if (!winner) return current
    return selector(current) > selector(winner) ? current : winner
  }, null)

const StatsBoard = ({ sessions }: StatsBoardProps) => {
  const players = buildPlayerAggregates(sessions)
  const summary = buildSeasonSummary(sessions)
  const mostProfitable = pickTop(players, (player) => player.totalProfit)
  const mostBuyIns = pickTop(players, (player) => player.totalPaid)
  const mostSessions = pickTop(players, (player) => player.sessionsPlayed)
  const [metric, setMetric] = useState<
    'profit' | 'paid' | 'chipValue' | 'sessions'
  >('profit')

  const metricConfig = {
    profit: {
      label: 'Profit',
      value: (player: (typeof players)[number]) => player.totalProfit,
      format: formatCurrency,
    },
    paid: {
      label: 'Paid',
      value: (player: (typeof players)[number]) => player.totalPaid,
      format: formatCurrency,
    },
    chipValue: {
      label: 'Chip value',
      value: (player: (typeof players)[number]) => player.totalChipValue,
      format: formatCurrency,
    },
    sessions: {
      label: 'Sessions',
      value: (player: (typeof players)[number]) => player.sessionsPlayed,
      format: (value: number) => String(value),
    },
  }

  const metricValues = metricConfig[metric]
  const sortedPlayers = [...players].sort(
    (a, b) => metricValues.value(b) - metricValues.value(a),
  )
  const maxMetricValue = Math.max(
    1,
    ...sortedPlayers.map((player) => Math.abs(metricValues.value(player))),
  )
  const roiPercent = Math.min(1, Math.abs(summary.totalRoi))
  const roiStroke = 2 * Math.PI * 46
  const roiDash = roiStroke * roiPercent

  return (
    <div className="board">
      <section className="column glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Highlights</p>
            <h2>Who is driving the season</h2>
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
          <div className="stat-card">
            <p className="stat-title">Best session</p>
            <p className="stat-value">
              {summary.bestSession
                ? formatCurrency(summary.bestSession.totalProfit)
                : '$0.00'}
            </p>
            <p className="stat-meta">{summary.bestSession?.label ?? 'No sessions yet'}</p>
          </div>
        </div>
      </section>

      <section className="column glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Totals</p>
            <h2>Full season ledger</h2>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-title">Total buy-ins</p>
            <p className="stat-value">{formatCurrency(summary.totalPaid)}</p>
            <p className="stat-meta">All sessions combined</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Total chip value</p>
            <p className="stat-value">{formatCurrency(summary.totalChipValue)}</p>
            <p className="stat-meta">All cash-outs combined</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Total profit</p>
            <p className="stat-value">{formatCurrency(summary.totalProfit)}</p>
            <p className="stat-meta">Net across the season</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Unique players</p>
            <p className="stat-value">{summary.uniquePlayers}</p>
            <p className="stat-meta">Across all days</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Average table size</p>
            <p className="stat-value">{summary.averageTableSize.toFixed(1)}</p>
            <p className="stat-meta">Players per session</p>
          </div>
        </div>
      </section>

      <section className="column glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Interactive</p>
            <h2>Explore the leaderboard</h2>
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
                className={`stat-wheel-value ${
                  summary.totalRoi >= 0 ? '' : 'stat-wheel-negative'
                }`}
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
              <strong>{formatPercent(summary.totalRoi)}</strong>
              <p>Profit versus total buy-ins</p>
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
                  const width = Math.max(6, (Math.abs(value) / maxMetricValue) * 100)
                  return (
                    <div key={player.name} className="stat-bar-row">
                      <span>{player.name}</span>
                      <div className="stat-bar-track">
                        <div
                          className={`stat-bar-fill ${
                            value >= 0 ? '' : 'stat-bar-fill-negative'
                          }`}
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
