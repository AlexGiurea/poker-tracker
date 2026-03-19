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
          <p className="eyebrow">Poker nights, elevated</p>
          <h1 className="brand-mark">Poker Tracker</h1>
        </div>
        <div className="landing-nav-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenDashboard('profiles')}
          >
            Player profiles
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onOpenDashboard('stats')}
          >
            Open dashboard
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy glass-panel tilt-card">
          <p className="eyebrow">Live home game intelligence</p>
          <h2>Track every buy-in, every stack, and every swing in one cinematic dashboard.</h2>
          <p className="subtitle">
            A polished landing page for the league, a redesigned control center
            for sessions, and data that now reflects the latest nights.
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
              Explore season stats
            </button>
          </div>
          <div className="hero-highlights">
            <div className="hero-highlight-card">
              <span className="hero-highlight-label">Latest session</span>
              <strong>{summary.latestSession?.label ?? 'No sessions'}</strong>
            </div>
            <div className="hero-highlight-card">
              <span className="hero-highlight-label">Top earner</span>
              <strong>{topPlayers[0]?.name ?? 'No players'}</strong>
            </div>
          </div>
        </div>

        <div className="hero-stage">
          <div className="hero-orbit glass-panel tilt-card">
            <span className="floating-pill">Season ROI</span>
            <strong>{formatPercent(summary.totalRoi)}</strong>
            <p>{formatCurrency(summary.totalProfit)} net across the full run.</p>
          </div>
          <div className="hero-metrics">
            <article className="metric-tile glass-panel tilt-card">
              <span>Total buy-ins</span>
              <strong>{formatCurrency(summary.totalPaid)}</strong>
            </article>
            <article className="metric-tile glass-panel tilt-card">
              <span>Unique players</span>
              <strong>{summary.uniquePlayers}</strong>
            </article>
            <article className="metric-tile glass-panel tilt-card">
              <span>Entries tracked</span>
              <strong>{summary.totalEntries}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-feature-grid">
        <article className="feature-card glass-panel tilt-card">
          <p className="eyebrow">01</p>
          <h3>Session control room</h3>
          <p>
            Add players, adjust buy-ins, track cash-outs, and keep the whole
            night visible in a cleaner, faster board.
          </p>
        </article>
        <article className="feature-card glass-panel tilt-card">
          <p className="eyebrow">02</p>
          <h3>Profiles with memory</h3>
          <p>
            Every player now rolls into a profile view with ROI, best night,
            average profit, and session history.
          </p>
        </article>
        <article className="feature-card glass-panel tilt-card">
          <p className="eyebrow">03</p>
          <h3>League story at a glance</h3>
          <p>
            The landing experience surfaces the shape of the season before you
            ever enter the dashboard.
          </p>
        </article>
      </section>

      <section className="landing-showcase">
        <div className="showcase-panel glass-panel">
          <div className="showcase-copy">
            <p className="eyebrow">Leader table</p>
            <h3>Top profit leaders</h3>
            <p className="subtitle">
              Quick access to the strongest performers across the full dataset.
            </p>
          </div>
          <div className="leader-stack">
            {topPlayers.map((player, index) => (
              <button
                key={player.name}
                type="button"
                className="leader-card tilt-card"
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
        </div>

        <div className="showcase-panel glass-panel tilt-card">
          <p className="eyebrow">Best night</p>
          <h3>{summary.bestSession?.label ?? 'No sessions yet'}</h3>
          <p className="subtitle">
            {summary.bestSession
              ? `${summary.bestSession.playerCount} players, ${formatCurrency(
                  summary.bestSession.totalProfit,
                )} net profit tracked.`
              : 'Add a session to generate nightly highlights.'}
          </p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenDashboard('stats')}
          >
            View leaderboard
          </button>
        </div>
      </section>

      <section className="landing-cta glass-panel">
        <div>
          <p className="eyebrow">Ready for the next game?</p>
          <h3>Jump into the redesigned dashboard and keep the ledger sharp.</h3>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => onOpenDashboard('sessions')}
        >
          Enter dashboard
        </button>
      </section>
    </div>
  )
}

export default LandingPage
