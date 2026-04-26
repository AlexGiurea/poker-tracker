import type { Session } from '../types/poker'
import {
  buildPlayerAggregates,
  buildSeasonSummary,
  formatCurrency,
  formatPercent,
} from '../lib/analytics'

type LandingPageProps = {
  sessions: Session[]
  onOpenDashboard: (page?: 'sessions' | 'stats' | 'profiles') => void
}

const LandingPage = ({ sessions, onOpenDashboard }: LandingPageProps) => {
  const summary = buildSeasonSummary(sessions)
  const topPlayers = buildPlayerAggregates(sessions)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 3)

  return (
    <div className="landing-page">
      <header className="landing-nav glass-panel">
        <div>
          <p className="eyebrow">Poker tracker</p>
          <h1 className="brand-mark">Poker Tracker</h1>
        </div>
        <div className="landing-nav-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenDashboard('sessions')}
          >
            Sessions
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenDashboard('stats')}
          >
            Statistics
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onOpenDashboard('profiles')}
          >
            Profiles
          </button>
        </div>
      </header>

      <section className="landing-simple-grid">
        <div className="hero-copy glass-panel">
          <p className="eyebrow">Quick access</p>
          <h2>Open sessions, season stats, or player profiles without digging through extra menus.</h2>
          <p className="subtitle">
            The app now starts with a cleaner front door. Pick the part of the
            tracker you want and jump straight there.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => onOpenDashboard('sessions')}
            >
              Run tonight&apos;s table
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onOpenDashboard('stats')}
            >
              Season stats
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onOpenDashboard('profiles')}
            >
              Go to profiles
            </button>
          </div>
        </div>

        <aside className="showcase-panel glass-panel">
          <p className="eyebrow">Season snapshot</p>
          <h3>Current overview</h3>
          <div className="landing-overview-list">
            <div className="landing-overview-row">
              <span>Latest session</span>
              <strong>{summary.latestSession?.label ?? 'No sessions'}</strong>
            </div>
            <div className="landing-overview-row">
              <span>Total profit</span>
              <strong>{formatCurrency(summary.totalProfit)}</strong>
            </div>
            <div className="landing-overview-row">
              <span>Season ROI</span>
              <strong>{formatPercent(summary.totalRoi)}</strong>
            </div>
            <div className="landing-overview-row">
              <span>Top player</span>
              <strong>{topPlayers[0]?.name ?? 'No players'}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="landing-summary-grid">
        <button
          type="button"
          className="quick-link-card glass-panel"
          onClick={() => onOpenDashboard('sessions')}
        >
          <span className="eyebrow">Sessions</span>
          <strong>Manage live tables</strong>
          <p className="subtitle">Add players, edit buy-ins, and update results.</p>
        </button>
        <button
          type="button"
          className="quick-link-card glass-panel"
          onClick={() => onOpenDashboard('stats')}
        >
          <span className="eyebrow">Statistics</span>
          <strong>Read the season</strong>
          <p className="subtitle">See leaders, ROI, and total performance.</p>
        </button>
        <button
          type="button"
          className="quick-link-card glass-panel"
          onClick={() => onOpenDashboard('profiles')}
        >
          <span className="eyebrow">Profiles</span>
          <strong>Open player pages</strong>
          <p className="subtitle">Jump straight into personal performance views.</p>
        </button>
      </section>

      <section className="landing-leaderboard glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Top players</p>
            <h3>Best profit so far</h3>
          </div>
        </div>
        <div className="leader-stack">
          {topPlayers.map((player, index) => (
            <button
              key={player.name}
              type="button"
              className="leader-card"
              onClick={() => onOpenDashboard('profiles')}
            >
              <span className="leader-rank">0{index + 1}</span>
              <div>
                <strong>{player.name}</strong>
                <p>{player.sessionsPlayed} sessions played</p>
              </div>
              <span className={player.totalProfit >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(player.totalProfit)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default LandingPage
