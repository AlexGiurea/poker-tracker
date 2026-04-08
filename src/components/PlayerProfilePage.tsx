import { useEffect, useState } from 'react'
import type { Session } from '../types/poker'
import { formatCurrency, formatPercent } from '../lib/analytics'
import {
  buildPlayerProfile,
  type PlayerProfileSnapshot,
  type PlayerSessionRow,
} from '../lib/playerProfiles'
import ShareProfileModal from './ShareProfileModal'

type PlayerProfilePageProps = {
  sessions?: Session[]
  playerName?: string
  profileSnapshot?: PlayerProfileSnapshot | null
  sharedMode?: boolean
}

const buildTrendChart = (sessions: PlayerSessionRow[]) => {
  const width = 760
  const height = 260
  const paddingX = 36
  const paddingY = 28
  const values = sessions.map((session) => session.cumulativeProfit)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const range = Math.max(maxValue - minValue, 1)
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingY * 2
  const step = sessions.length > 1 ? usableWidth / (sessions.length - 1) : 0

  const points = sessions.map((session, index) => {
    const x = sessions.length === 1 ? width / 2 : paddingX + step * index
    const y = paddingY + ((maxValue - session.cumulativeProfit) / range) * usableHeight
    return {
      ...session,
      x,
      y,
    }
  })

  const zeroY = paddingY + ((maxValue - 0) / range) * usableHeight
  const linePath = points.map((point) => `${point.x},${point.y}`).join(' ')

  return {
    width,
    height,
    zeroY,
    points,
    linePath,
  }
}

const PlayerProfilePage = ({
  sessions = [],
  playerName = '',
  profileSnapshot,
  sharedMode = false,
}: PlayerProfilePageProps) => {
  const profile = profileSnapshot ?? buildPlayerProfile(sessions, playerName)
  const sessionRows = profile?.sessions ?? []
  const latestSessionId = sessionRows.at(-1)?.sessionId ?? ''
  const [activeSessionId, setActiveSessionId] = useState(latestSessionId)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useEffect(() => {
    setActiveSessionId(latestSessionId)
  }, [latestSessionId, profile?.name])

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-page-header glass-panel">
          <h2>Profile not found</h2>
          <p className="subtitle">
            {sharedMode
              ? 'This shared profile link is invalid or incomplete.'
              : 'Select a player to view their stats.'}
          </p>
        </div>
      </div>
    )
  }

  const chart = buildTrendChart(sessionRows)
  const activeSession =
    sessionRows.find((session) => session.sessionId === activeSessionId) ??
    sessionRows.at(-1) ??
    null

  return (
    <div className="profile-page">
      <div className="profile-page-header glass-panel">
        <div className="profile-hero">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              <span>{profile.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="profile-label">
                {sharedMode ? 'Shared player profile' : 'Player profile'}
              </p>
              <h2>{profile.name}</h2>
              <p className="subtitle">
                {sharedMode
                  ? 'Read-only performance snapshot'
                  : 'Lifetime performance overview'}
              </p>
            </div>
          </div>
          <div className="profile-profit">
            <span>Total profit</span>
            <strong className={profile.totalProfit >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(profile.totalProfit)}
            </strong>
            {!sharedMode ? (
              <button
                type="button"
                className="ghost-button profile-page-share-button"
                onClick={() => setIsShareModalOpen(true)}
              >
                Share profile
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {activeSession ? (
        <section className="profile-trend glass-panel">
          <div className="profile-trend-header">
            <div>
              <p className="eyebrow">Performance line</p>
              <h3>Cumulative profit trend</h3>
              <p className="subtitle">
                Follow how {profile.name}&apos;s running profit changes from one session to the next.
              </p>
            </div>
            <div className="profile-trend-focus">
              <span className="profile-label">{activeSession.sessionLabel}</span>
              <strong
                className={activeSession.profit >= 0 ? 'positive' : 'negative'}
              >
                {formatCurrency(activeSession.profit)}
              </strong>
              <p className="subtitle">
                Running total {formatCurrency(activeSession.cumulativeProfit)}
              </p>
            </div>
          </div>

          <div className="profile-trend-chart">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              role="img"
              aria-label={`${profile.name} cumulative profit trend`}
            >
              <line
                className="profile-trend-zero"
                x1="0"
                y1={chart.zeroY}
                x2={chart.width}
                y2={chart.zeroY}
              />
              <polyline
                className="profile-trend-line"
                points={chart.linePath}
              />
              {chart.points.map((point) => (
                <g key={point.sessionId}>
                  {point.sessionId === activeSession.sessionId ? (
                    <line
                      className="profile-trend-guide"
                      x1={point.x}
                      y1="0"
                      x2={point.x}
                      y2={chart.height}
                    />
                  ) : null}
                  <circle
                    className={`profile-trend-point ${
                      point.sessionId === activeSession.sessionId ? 'active' : ''
                    }`}
                    cx={point.x}
                    cy={point.y}
                    r={point.sessionId === activeSession.sessionId ? 8 : 6}
                    onMouseEnter={() => setActiveSessionId(point.sessionId)}
                    onClick={() => setActiveSessionId(point.sessionId)}
                  />
                </g>
              ))}
            </svg>
          </div>

          <div className="profile-trend-metrics">
            <article className="profile-trend-metric">
              <span className="profile-label">Session result</span>
              <strong className={activeSession.profit >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(activeSession.profit)}
              </strong>
            </article>
            <article className="profile-trend-metric">
              <span className="profile-label">Running total</span>
              <strong>{formatCurrency(activeSession.cumulativeProfit)}</strong>
            </article>
            <article className="profile-trend-metric">
              <span className="profile-label">Buy-in / cash-out</span>
              <strong>
                {formatCurrency(activeSession.paid)} / {formatCurrency(activeSession.chipValue)}
              </strong>
            </article>
          </div>

          <div className="profile-trend-sessions">
            {sessionRows.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                className={`profile-trend-session ${
                  session.sessionId === activeSession.sessionId ? 'active' : ''
                }`}
                onClick={() => setActiveSessionId(session.sessionId)}
              >
                {session.sessionLabel}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="profile-kpis">
        <div className="stat-card">
          <p className="stat-title">Sessions played</p>
          <p className="stat-value">{profile.sessionsPlayed}</p>
          <p className="stat-meta">Total appearances</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Total paid</p>
          <p className="stat-value">{formatCurrency(profile.totalPaid)}</p>
          <p className="stat-meta">All buy-ins</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Total chip value</p>
          <p className="stat-value">{formatCurrency(profile.totalChipValue)}</p>
          <p className="stat-meta">All cash-outs</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Average profit</p>
          <p className="stat-value">{formatCurrency(profile.averageProfit)}</p>
          <p className="stat-meta">Per session</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Best session</p>
          <p className="stat-value">{formatCurrency(profile.bestSessionProfit)}</p>
          <p className="stat-meta">Highest profit</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Worst session</p>
          <p className="stat-value">{formatCurrency(profile.worstSessionProfit)}</p>
          <p className="stat-meta">Lowest profit</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">ROI</p>
          <p className="stat-value">{formatPercent(profile.roi)}</p>
          <p className="stat-meta">Total profit divided by total paid</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Average buy-in</p>
          <p className="stat-value">{formatCurrency(profile.averagePaid)}</p>
          <p className="stat-meta">Per session</p>
        </div>
      </section>

      <section className="profile-sessions glass-panel">
        <div className="column-header">
          <div>
            <h3>Session history</h3>
            <p>
              {sharedMode
                ? 'Performance included in this shared snapshot'
                : 'Performance across each tracked day'}
            </p>
          </div>
        </div>
        <div className="profile-session-list">
          {sessionRows.map((session) => (
            <div key={session.sessionId} className="profile-session-row">
              <div>
                <p className="profile-session-title">{session.sessionLabel}</p>
                <p className="profile-session-meta">
                  Paid {formatCurrency(session.paid)} / Chip value{' '}
                  {formatCurrency(session.chipValue)}
                </p>
              </div>
              <div
                className={`profile-session-profit ${
                  session.profit >= 0 ? 'positive' : 'negative'
                }`}
              >
                {formatCurrency(session.profit)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <ShareProfileModal
        isOpen={isShareModalOpen}
        snapshot={profile}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  )
}

export default PlayerProfilePage
