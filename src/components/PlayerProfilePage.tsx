import type { Session } from '../types/poker'

type PlayerProfilePageProps = {
  sessions: Session[]
  playerName: string
  onBack: () => void
}

type PlayerProfile = {
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

type PlayerSession = {
  sessionId: string
  sessionLabel: string
  paid: number
  chipValue: number
  profit: number
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const buildProfile = (sessions: Session[], name: string) => {
  const sessionProfits: number[] = []
  const sessionRows: PlayerSession[] = []

  let totalPaid = 0
  let totalChipValue = 0

  sessions.forEach((session) => {
    const player = Object.values(session.players).find(
      (entry) => entry.name === name,
    )
    if (!player) return

    const profit = player.chipValue - player.paid
    totalPaid += player.paid
    totalChipValue += player.chipValue
    sessionProfits.push(profit)
    sessionRows.push({
      sessionId: session.id,
      sessionLabel: session.label,
      paid: player.paid,
      chipValue: player.chipValue,
      profit,
    })
  })

  if (!sessionRows.length) return null

  const totalProfit = totalChipValue - totalPaid
  const sessionsPlayed = sessionRows.length
  const averageProfit = totalProfit / sessionsPlayed
  const averagePaid = totalPaid / sessionsPlayed
  const bestSessionProfit = Math.max(...sessionProfits)
  const worstSessionProfit = Math.min(...sessionProfits)
  const roi = totalPaid > 0 ? totalProfit / totalPaid : 0

  const profile: PlayerProfile = {
    name,
    totalPaid,
    totalChipValue,
    totalProfit,
    sessionsPlayed,
    averageProfit,
    averagePaid,
    bestSessionProfit,
    worstSessionProfit,
    roi,
  }

  return { profile, sessions: sessionRows }
}

const PlayerProfilePage = ({
  sessions,
  playerName,
  onBack,
}: PlayerProfilePageProps) => {
  const result = buildProfile(sessions, playerName)

  if (!result) {
    return (
      <div className="profile-page">
        <div className="profile-page-header">
          <button type="button" className="profile-back" onClick={onBack}>
            Back to profiles
          </button>
          <h2>Profile not found</h2>
          <p className="subtitle">Select a player to view their stats.</p>
        </div>
      </div>
    )
  }

  const { profile, sessions: sessionRows } = result

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <button type="button" className="profile-back" onClick={onBack}>
          Back to profiles
        </button>
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
          <p className="stat-meta">All cashouts</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Avg profit</p>
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
          <p className="stat-value">{(profile.roi * 100).toFixed(1)}%</p>
          <p className="stat-meta">Total profit / total paid</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Avg buy-in</p>
          <p className="stat-value">{formatCurrency(profile.averagePaid)}</p>
          <p className="stat-meta">Per session</p>
        </div>
      </section>

      <section className="profile-sessions">
        <div className="column-header">
          <div>
            <h3>Session history</h3>
            <p>Performance across each day</p>
          </div>
        </div>
        <div className="profile-session-list">
          {sessionRows.map((session) => (
            <div key={session.sessionId} className="profile-session-row">
              <div>
                <p className="profile-session-title">{session.sessionLabel}</p>
                <p className="profile-session-meta">
                  Paid {formatCurrency(session.paid)} · Chip Value{' '}
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
