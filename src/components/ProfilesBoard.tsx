import { useMemo, useState } from 'react'
import type { Session } from '../types/poker'
import { buildPlayerAggregates, formatCurrency, formatPercent } from '../lib/analytics'
import { buildPlayerProfile } from '../lib/playerProfiles'
import ShareProfileModal from './ShareProfileModal'

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
  const [sharePlayerName, setSharePlayerName] = useState<string | null>(null)
  const players = buildPlayerAggregates(sessions)
  const sortedPlayers = [...players].sort(
    (a, b) => b.totalProfit - a.totalProfit,
  )
  const activePlayer =
    sortedPlayers.find((player) => player.name === selectedPlayerName) ??
    sortedPlayers[0] ??
    null
  const shareSnapshot = useMemo(
    () => (sharePlayerName ? buildPlayerProfile(sessions, sharePlayerName) : null),
    [sessions, sharePlayerName],
  )

  return (
    <>
      <div className="board">
        <section className="column glass-panel">
          <div className="column-header">
            <div>
              <p className="eyebrow">Profiles</p>
              <h2>Open or share any player profile</h2>
              <p>Share opens a centered sheet with copy-link and WhatsApp options.</p>
            </div>
          </div>
          {players.length === 0 ? (
            <p className="empty-state">No players yet.</p>
          ) : (
            <div className="profile-grid">
              {sortedPlayers.map((player) => {
                const isSelected = player.name === activePlayer?.name
                return (
                  <article
                    key={player.name}
                    className={`profile-card glass-panel ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectPlayer?.(player.name)}
                  >
                    <div className="profile-header">
                      <div>
                        <h3>{player.name}</h3>
                      </div>
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
                        <span className="profile-label">ROI</span>
                        <span>{formatPercent(player.roi)}</span>
                      </div>
                    </div>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="ghost-button profile-card-cta"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectPlayer?.(player.name)
                          onOpenProfile?.(player.name)
                        }}
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        className="ghost-button profile-card-cta profile-card-share"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSharePlayerName(player.name)
                        }}
                      >
                        Share
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <ShareProfileModal
        isOpen={Boolean(sharePlayerName)}
        snapshot={shareSnapshot}
        onClose={() => setSharePlayerName(null)}
      />
    </>
  )
}

export default ProfilesBoard
