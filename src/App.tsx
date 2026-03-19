import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Board from './components/Board'
import ChatbotWidget from './components/ChatbotWidget'
import LandingPage from './components/LandingPage'
import PlayerProfilePage from './components/PlayerProfilePage'
import ProfilesBoard from './components/ProfilesBoard'
import StatsBoard from './components/StatsBoard'
import { seedData } from './data/seed'
import { buildPlayerAggregates, buildSeasonSummary, formatCurrency, formatPercent } from './lib/analytics'
import type { BoardData, Player, Session } from './types/poker'

type DashboardPage = 'sessions' | 'stats' | 'profiles' | 'profile'

const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeBoardData = (input: BoardData): BoardData => {
  let changed = false
  const sessions = input.sessions.map((session) => {
    let sessionChanged = false
    const players = Object.fromEntries(
      Object.entries(session.players).map(([playerId, player]) => {
        const legacyPlayer = player as Player & {
          cashedOut?: number
          remainingChips?: number
          chipValue?: number
        }

        if (typeof legacyPlayer.chipValue === 'number') {
          return [playerId, legacyPlayer] as const
        }

        const chipValue =
          typeof legacyPlayer.remainingChips === 'number'
            ? legacyPlayer.remainingChips
            : typeof legacyPlayer.cashedOut === 'number'
              ? legacyPlayer.cashedOut
              : 0

        const { cashedOut, remainingChips, ...rest } = legacyPlayer
        sessionChanged = true
        return [playerId, { ...rest, chipValue }] as const
      }),
    )

    const existingPlayerIds = Object.keys(session.players)
    const settledIds = new Set(
      session.columns.flatMap((column) => column.playerIds),
    )
    const normalizedSettledIds = [
      ...existingPlayerIds.filter((id) => settledIds.has(id)),
      ...existingPlayerIds.filter((id) => !settledIds.has(id)),
    ]
    const nextColumns = [
      {
        id: 'settled',
        title: 'Settled',
        playerIds: normalizedSettledIds,
      },
    ]

    if (
      sessionChanged ||
      nextColumns.length !== session.columns.length ||
      nextColumns[0].id !== session.columns[0]?.id ||
      nextColumns[0].title !== session.columns[0]?.title ||
      nextColumns[0].playerIds.join('|') !==
        session.columns[0]?.playerIds.join('|')
    ) {
      changed = true
      return { ...session, players, columns: nextColumns }
    }

    return session
  })

  return changed ? { sessions } : input
}

const buildSession = (id: string, label: string): Session => ({
  id,
  label,
  players: {},
  columns: [{ id: 'settled', title: 'Settled', playerIds: [] }],
})

const getNextDayNumber = (sessions: Session[]) => {
  const dayNumbers = sessions
    .map((session) => {
      const match = /^day\s+(\d+)$/i.exec(session.label.trim())
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))

  if (!dayNumbers.length) return 1
  return Math.max(...dayNumbers) + 1
}

const toSessionId = (label: string, existing: Set<string>) => {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const fallbackBase = base || `day-${Date.now()}`
  let candidate = fallbackBase
  let counter = 2

  while (existing.has(candidate)) {
    candidate = `${fallbackBase}-${counter}`
    counter += 1
  }

  return candidate
}

const pageTitles: Record<Exclude<DashboardPage, 'profile'>, string> = {
  sessions: 'Session control room',
  stats: 'Season analytics',
  profiles: 'Player profiles',
}

const App = () => {
  const [data, setData] = useState<BoardData>(() =>
    normalizeBoardData(seedData),
  )
  const normalizedData = normalizeBoardData(data)
  const [appView, setAppView] = useState<'landing' | 'dashboard'>('landing')
  const [activePage, setActivePage] = useState<DashboardPage>('stats')
  const [selectedSessionId, setSelectedSessionId] = useState(
    normalizedData.sessions[0]?.id ?? '',
  )
  const [newName, setNewName] = useState('')
  const [newPaid, setNewPaid] = useState('6')
  const [newChipValue, setNewChipValue] = useState('0')
  const [selectedPlayerName, setSelectedPlayerName] = useState('')
  const [newSessionLabel, setNewSessionLabel] = useState(
    `Day ${getNextDayNumber(normalizedData.sessions)}`,
  )

  useEffect(() => {
    if (
      !normalizedData.sessions.find(
        (session) => session.id === selectedSessionId,
      )
    ) {
      setSelectedSessionId(normalizedData.sessions[0]?.id ?? '')
    }
  }, [normalizedData.sessions, selectedSessionId])

  useEffect(() => {
    if (normalizedData !== data) {
      setData(normalizedData)
    }
  }, [data, normalizedData])

  const session = normalizedData.sessions.find(
    (current) => current.id === selectedSessionId,
  )
  const seasonSummary = buildSeasonSummary(normalizedData.sessions)
  const leaderboard = buildPlayerAggregates(normalizedData.sessions)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 4)
  const activeDashboardTab = activePage === 'profile' ? 'profiles' : activePage

  const updateSession = (updatedSession: Session) => {
    setData((prev) => ({
      sessions: prev.sessions.map((existing) =>
        existing.id === updatedSession.id ? updatedSession : existing,
      ),
    }))
  }

  const handlePlayerUpdate = (playerId: string, updates: Partial<Player>) => {
    if (!session) return

    updateSession({
      ...session,
      players: {
        ...session.players,
        [playerId]: { ...session.players[playerId], ...updates },
      },
    })
  }

  const handleAddPlayer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || !newName.trim()) return

    const id = `${session.id}-${Date.now()}`
    const player: Player = {
      id,
      name: newName.trim(),
      paid: toNumber(newPaid),
      chipValue: toNumber(newChipValue),
    }
    const targetColumnId = session.columns.find((column) => column.id === 'playing')?.id
      ?? session.columns[0]?.id
    const updatedColumns = session.columns.map((column) =>
      column.id === targetColumnId
        ? { ...column, playerIds: [...column.playerIds, id] }
        : column,
    )

    updateSession({
      ...session,
      players: { ...session.players, [id]: player },
      columns: updatedColumns,
    })

    setNewName('')
    setNewPaid('6')
    setNewChipValue('0')
  }

  const handleAddSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedLabel = newSessionLabel.trim()
    const label =
      trimmedLabel.length > 0
        ? trimmedLabel
        : `Day ${getNextDayNumber(normalizedData.sessions)}`
    const existingIds = new Set(normalizedData.sessions.map((item) => item.id))
    const id = toSessionId(label, existingIds)
    const nextSession = buildSession(id, label)

    setData((prev) => ({ sessions: [...prev.sessions, nextSession] }))
    setSelectedSessionId(id)
    setAppView('dashboard')
    setActivePage('sessions')
    setNewSessionLabel(`Day ${getNextDayNumber(normalizedData.sessions) + 1}`)
  }

  const handleRemoveSession = () => {
    if (!session || normalizedData.sessions.length <= 1) return

    const currentIndex = normalizedData.sessions.findIndex(
      (current) => current.id === session.id,
    )
    const nextSessions = normalizedData.sessions.filter(
      (current) => current.id !== session.id,
    )
    const fallbackIndex = currentIndex > 0 ? currentIndex - 1 : 0
    const nextSelectedId = nextSessions[fallbackIndex]?.id ?? ''

    setData({ sessions: nextSessions })
    setSelectedSessionId(nextSelectedId)
    setActivePage('sessions')
    setNewSessionLabel(`Day ${getNextDayNumber(nextSessions)}`)
  }

  const openDashboard = (page: Exclude<DashboardPage, 'profile'> = 'stats') => {
    setAppView('dashboard')
    setActivePage(page)
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      {appView === 'landing' ? (
        <LandingPage
          sessions={normalizedData.sessions}
          onOpenDashboard={openDashboard}
        />
      ) : (
        <div className="app dashboard-app">
          <header className="dashboard-header glass-panel">
            <div className="dashboard-header-top">
              <button
                type="button"
                className="brand-button"
                onClick={() => setAppView('landing')}
              >
                Poker Tracker
              </button>
              <div className="dashboard-header-actions">
                {activePage === 'profile' ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setActivePage('profiles')}
                  >
                    Back to profiles
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setAppView('landing')}
                >
                  Landing page
                </button>
              </div>
            </div>

            <div className="dashboard-hero">
              <div className="dashboard-copy">
                <p className="eyebrow">League command center</p>
                <h1>{pageTitles[activeDashboardTab]}</h1>
                <p className="subtitle">
                  {activeDashboardTab === 'sessions'
                    ? 'Manage nights, adjust player results, and keep the ledger current.'
                    : activeDashboardTab === 'stats'
                      ? 'Follow the overall shape of the season, not just a single table.'
                      : 'Open every player record with full context across the full run.'}
                </p>
              </div>

              <div className="dashboard-summary-grid">
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Net profit</span>
                    <strong className="summary-card-value">
                      {formatCurrency(seasonSummary.totalProfit)}
                    </strong>
                  </div>
                  <p className="summary-card-meta">
                    {formatPercent(seasonSummary.totalRoi)} ROI
                  </p>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Tracked entries</span>
                    <strong className="summary-card-value">
                      {seasonSummary.totalEntries}
                    </strong>
                  </div>
                  <p className="summary-card-meta">
                    {seasonSummary.uniquePlayers} unique players
                  </p>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Latest session</span>
                    <strong className="summary-card-value">
                      {seasonSummary.latestSession?.label ?? 'No sessions'}
                    </strong>
                  </div>
                  <p className="summary-card-meta">
                    {seasonSummary.latestSession
                      ? `${seasonSummary.latestSession.playerCount} players`
                      : 'Ready for the next table'}
                  </p>
                </article>
              </div>

              <aside className="dashboard-spotlight glass-panel">
                <div>
                  <p className="eyebrow">Top profit table</p>
                  <h2>Current leaders</h2>
                </div>
                <div className="spotlight-list">
                  {leaderboard.map((player, index) => (
                    <button
                      key={player.name}
                      type="button"
                      className="spotlight-row"
                      onClick={() => {
                        setSelectedPlayerName(player.name)
                        setActivePage('profile')
                      }}
                    >
                      <span className="spotlight-rank">0{index + 1}</span>
                      <span>{player.name}</span>
                      <span
                        className={player.totalProfit >= 0 ? 'positive' : 'negative'}
                      >
                        {formatCurrency(player.totalProfit)}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="page-tabs dashboard-tabs">
              <button
                type="button"
                className={activeDashboardTab === 'sessions' ? 'active' : ''}
                onClick={() => setActivePage('sessions')}
              >
                Sessions
              </button>
              <button
                type="button"
                className={activeDashboardTab === 'stats' ? 'active' : ''}
                onClick={() => setActivePage('stats')}
              >
                Statistics
              </button>
              <button
                type="button"
                className={activeDashboardTab === 'profiles' ? 'active' : ''}
                onClick={() => setActivePage('profiles')}
              >
                Profiles
              </button>
            </div>
          </header>

          {activePage === 'stats' ? (
            <StatsBoard sessions={normalizedData.sessions} />
          ) : activePage === 'profiles' ? (
            <ProfilesBoard
              sessions={normalizedData.sessions}
              selectedPlayerName={selectedPlayerName}
              onSelectPlayer={setSelectedPlayerName}
              onOpenProfile={(playerName) => {
                setSelectedPlayerName(playerName)
                setActivePage('profile')
              }}
            />
          ) : activePage === 'profile' ? (
            <PlayerProfilePage
              sessions={normalizedData.sessions}
              playerName={selectedPlayerName}
            />
          ) : session ? (
            <>
              <section className="dashboard-form-grid">
                <form className="glass-panel form-panel" onSubmit={handleAddSession}>
                  <div className="form-panel-header">
                    <div>
                      <p className="eyebrow">Session builder</p>
                      <h2>Add a new poker day</h2>
                    </div>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      onClick={handleRemoveSession}
                      disabled={normalizedData.sessions.length <= 1}
                    >
                      Remove selected day
                    </button>
                  </div>
                  <div className="session-form-fields">
                    <label>
                      Day label
                      <input
                        type="text"
                        value={newSessionLabel}
                        onChange={(event) => setNewSessionLabel(event.target.value)}
                        placeholder={`Day ${getNextDayNumber(normalizedData.sessions)}`}
                      />
                    </label>
                    <button type="submit" className="primary-button">
                      Add day
                    </button>
                  </div>
                </form>

                <form className="glass-panel form-panel" onSubmit={handleAddPlayer}>
                  <div className="form-panel-header">
                    <div>
                      <p className="eyebrow">Player entry</p>
                      <h2>Add a player to {session.label}</h2>
                    </div>
                  </div>
                  <div className="player-form-fields">
                    <label>
                      Player
                      <input
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="Name"
                      />
                    </label>
                    <label>
                      Paid
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPaid}
                        onChange={(event) => setNewPaid(event.target.value)}
                      />
                    </label>
                    <label>
                      Chip value
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newChipValue}
                        onChange={(event) => setNewChipValue(event.target.value)}
                      />
                    </label>
                    <button type="submit" className="primary-button">
                      Add player
                    </button>
                  </div>
                </form>
              </section>

              <section className="glass-panel session-switcher">
                <div className="column-header">
                  <div>
                    <h2>Jump between sessions</h2>
                    <p>{normalizedData.sessions.length} days tracked</p>
                  </div>
                </div>
                <div className="session-tabs">
                  {normalizedData.sessions.map((current) => (
                    <button
                      key={current.id}
                      type="button"
                      className={current.id === selectedSessionId ? 'active' : ''}
                      onClick={() => setSelectedSessionId(current.id)}
                    >
                      {current.label}
                    </button>
                  ))}
                </div>
              </section>

              <Board
                session={session}
                onSessionChange={updateSession}
                onPlayerUpdate={handlePlayerUpdate}
                onViewProfile={(playerName) => {
                  setSelectedPlayerName(playerName)
                  setActivePage('profile')
                }}
              />
            </>
          ) : (
            <p className="empty-state">No session data available.</p>
          )}
        </div>
      )}

      <ChatbotWidget />
    </div>
  )
}

export default App
