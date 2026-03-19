import type { Session } from '../types/poker'
import { buildPlayerAggregates, formatCurrency, formatPercent } from '../lib/analytics'

type ProfilesBoardProps = {
  sessions: Session[]
  selectedPlayerName?: string
  onSelectPlayer?: (playerName: string) => void
  onOpenProfile?: (playerName: string) => void
}

const ProfilesBoard = ({
  sessions,
  selectedPlayerName,
  onSelectPlayer,
  onOpenProfile,
}: ProfilesBoardProps) => {
  const players = buildPlayerAggregates(sessions)
  const sortedPlayers = [...players].sort(
    (a, b) => b.totalProfit - a.totalProfit,
  )
  const activePlayer =
    sortedPlayers.find((player) => player.name === selectedPlayerName) ??
    sortedPlayers[0] ??
    null

  return (
    <div className="board">
      <section className="column glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Profiles</p>
            <h2>All-time player snapshots</h2>
            <p>Select a card, then open the full profile.</p>
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
                  className={`profile-card glass-panel ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectPlayer?.(player.name)}
                  onDoubleClick={() => onOpenProfile?.(player.name)}
                >
                  <div className="profile-header">
                    <h3>{player.name}</h3>
                    <span className={player.totalProfit >= 0 ? 'positive' : 'negative'}>
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
                      <span className="profile-label">Cash-outs</span>
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
                      <span>{formatPercent(player.roi)}</span>
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
