import type { Session } from '../types/poker'
import { buildPlayerAggregates, formatCurrency, formatPercent } from '../lib/analytics'

type PlayerProfilePageProps = {
  sessions: Session[]
  playerName: string
}

type PlayerSession = {
  sessionId: string
  sessionLabel: string
  paid: number
  chipValue: number
  profit: number
}

const buildProfile = (sessions: Session[], name: string) => {
  const profile = buildPlayerAggregates(sessions).find((player) => player.name === name)

  if (!profile) return null

  const sessionRows: PlayerSession[] = sessions.flatMap((session) => {
    const player = Object.values(session.players).find((entry) => entry.name === name)

    if (!player) return []

    return [
      {
        sessionId: session.id,
        sessionLabel: session.label,
        paid: player.paid,
        chipValue: player.chipValue,
        profit: player.chipValue - player.paid,
      },
    ]
  })

  return { profile, sessions: sessionRows }
}

const PlayerProfilePage = ({
  sessions,
  playerName,
}: PlayerProfilePageProps) => {
  const result = buildProfile(sessions, playerName)

  if (!result) {
    return (
      <div className="profile-page">
        <div className="profile-page-header glass-panel">
          <h2>Profile not found</h2>
          <p className="subtitle">Select a player to view their stats.</p>
        </div>
      </div>
    )
  }

  const { profile, sessions: sessionRows } = result

  return (
    <div className="profile-page">
      <div className="profile-page-header glass-panel">
        <div className="profile-hero">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              <span>{profile.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="profile-label">Player profile</p>
              <h2>{profile.name}</h2>
              <p className="subtitle">Lifetime performance overview</p>
            </div>
          </div>
          <div className="profile-profit">
            <span>Total profit</span>
            <strong className={profile.totalProfit >= 0 ? 'positive' : 'negative'}>
              {formatCurrency(profile.totalProfit)}
            </strong>
          </div>
        </div>
      </div>

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
            <p>Performance across each tracked day</p>
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
    </div>
  )
}

export default PlayerProfilePage
