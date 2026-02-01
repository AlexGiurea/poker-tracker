import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Board from './components/Board'
import ChatbotWidget from './components/ChatbotWidget'
import PlayerProfilePage from './components/PlayerProfilePage'
import ProfilesBoard from './components/ProfilesBoard'
import StatsBoard from './components/StatsBoard'
import { seedData } from './data/seed'
import type { BoardData, Player, Session } from './types/poker'

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

const App = () => {
  const [data, setData] = useState<BoardData>(() =>
    normalizeBoardData(seedData),
  )
  const normalizedData = normalizeBoardData(data)
  const [activePage, setActivePage] = useState<
    'sessions' | 'stats' | 'profiles' | 'profile'
  >('stats')
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
  }, [data, normalizedData, setData])

  const session = normalizedData.sessions.find(
    (current) => current.id === selectedSessionId,
  )


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

    const updatedColumns = session.columns.map((column) =>
      column.id === 'playing'
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

  return (
    <div className="app">
      <header className="app-header">
        {activePage === 'profile' ? (
          <button
            type="button"
            className="app-back"
            onClick={() => setActivePage('profiles')}
          >
            Back to profiles
          </button>
        ) : null}
        <p className="eyebrow">Poker Session Dashboard</p>
        <h1>Poker Tracker</h1>
        <div className="page-tabs">
          <button
            type="button"
            className={activePage === 'sessions' ? 'active' : ''}
            onClick={() => setActivePage('sessions')}
          >
            Sessions
          </button>
          <button
            type="button"
            className={activePage === 'stats' ? 'active' : ''}
            onClick={() => setActivePage('stats')}
          >
            Statistics
          </button>
          <button
            type="button"
            className={activePage === 'profiles' ? 'active' : ''}
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
          <section className="controls">
            <form className="add-session" onSubmit={handleAddSession}>
              <label>
                New day
                <input
                  type="text"
                  value={newSessionLabel}
                  onChange={(event) => setNewSessionLabel(event.target.value)}
                  placeholder={`Day ${getNextDayNumber(
                    normalizedData.sessions,
                  )}`}
                />
              </label>
              <button type="submit">Add day</button>
              <button
                type="button"
                className="remove-session"
                onClick={handleRemoveSession}
                disabled={normalizedData.sessions.length <= 1}
              >
                Remove day
              </button>
            </form>
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
          <section className="controls">
            <form className="add-player" onSubmit={handleAddPlayer}>
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
                Chip Value ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newChipValue}
                  onChange={(event) => setNewChipValue(event.target.value)}
                />
              </label>
              <button type="submit">Add player</button>
            </form>
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
      <ChatbotWidget />
    </div>
  )
}

export default App
