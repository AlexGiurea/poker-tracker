import type { Session } from '../types/poker'

type ProfilesBoardProps = {
  sessions: Session[]
  selectedPlayerName?: string
  onSelectPlayer?: (playerName: string) => void
  onOpenProfile?: (playerName: string) => void
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

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const buildPlayerProfiles = (sessions: Session[]) => {
  const totals = new Map<string, PlayerProfile & { sessionProfits: number[] }>()

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
      stats.sessionProfits.length > 0
        ? Math.max(...stats.sessionProfits)
        : 0
    const worstSessionProfit =
      stats.sessionProfits.length > 0
        ? Math.min(...stats.sessionProfits)
        : 0
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

const ProfilesBoard = ({
  sessions,
  selectedPlayerName,
  onSelectPlayer,
  onOpenProfile,
}: ProfilesBoardProps) => {
  const players = buildPlayerProfiles(sessions)
  const sortedPlayers = [...players].sort(
    (a, b) => b.totalProfit - a.totalProfit,
  )
  const activePlayer =
    sortedPlayers.find((player) => player.name === selectedPlayerName) ??
    sortedPlayers[0] ??
    null

  return (
    <div className="board">
      <section className="column">
        <div className="column-header">
          <div>
            <h2>Player profiles</h2>
            <p>All-time stats for every player</p>
          </div>
        </div>
        {players.length === 0 ? (
          <p className="empty-state">No players yet.</p>
        ) : (
          <div className="profile-grid">
            {sortedPlayers.map((player) => {
              const isSelected = player.name === activePlayer?.name
              return (
                <button
                  key={player.name}
                  type="button"
                  className={`profile-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectPlayer?.(player.name)}
                  onDoubleClick={() => onOpenProfile?.(player.name)}
                >
                  <div className="profile-header">
                    <h3>{player.name}</h3>
                    <span
                      className={player.totalProfit >= 0 ? 'positive' : 'negative'}
                    >
                      {formatCurrency(player.totalProfit)}
                    </span>
                  </div>
                  <div className="profile-stats">
                    <div>
                      <span className="profile-label">Sessions</span>
                      <span>{player.sessionsPlayed}</span>
                    </div>
                    <div>
                      <span className="profile-label">Total paid</span>
                      <span>{formatCurrency(player.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="profile-label">Total chip value</span>
                      <span>{formatCurrency(player.totalChipValue)}</span>
                    </div>
                    <div>
                      <span className="profile-label">Avg profit</span>
                      <span>{formatCurrency(player.averageProfit)}</span>
                    </div>
                    <div>
                      <span className="profile-label">Best session</span>
                      <span>{formatCurrency(player.bestSessionProfit)}</span>
                    </div>
                    <div>
                      <span className="profile-label">Worst session</span>
                      <span>{formatCurrency(player.worstSessionProfit)}</span>
                    </div>
                    <div>
                      <span className="profile-label">ROI</span>
                      <span>{(player.roi * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="profile-label">Avg buy-in</span>
                      <span>{formatCurrency(player.averagePaid)}</span>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      className="profile-link"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenProfile?.(player.name)
                      }}
                    >
                      Open full profile
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProfilesBoard
