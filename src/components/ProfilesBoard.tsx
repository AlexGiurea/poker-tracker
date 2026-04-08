import { useEffect, useState } from 'react'
import type { Session } from '../types/poker'
import { buildPlayerAggregates, formatCurrency, formatPercent } from '../lib/analytics'
import { buildPlayerProfile } from '../lib/playerProfiles'
import { buildSharedProfileUrl } from '../lib/sharedProfiles'

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
  const [openShareMenuFor, setOpenShareMenuFor] = useState<string | null>(null)
  const [copyFeedbackFor, setCopyFeedbackFor] = useState<string | null>(null)
  const players = buildPlayerAggregates(sessions)
  const sortedPlayers = [...players].sort(
    (a, b) => b.totalProfit - a.totalProfit,
  )
  const activePlayer =
    sortedPlayers.find((player) => player.name === selectedPlayerName) ??
    sortedPlayers[0] ??
    null

  useEffect(() => {
    if (!copyFeedbackFor) return

    const timeoutId = window.setTimeout(() => {
      setCopyFeedbackFor(null)
    }, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [copyFeedbackFor])

  const getShareUrl = (playerName: string) => {
    const snapshot = buildPlayerProfile(sessions, playerName)
    return snapshot ? buildSharedProfileUrl(snapshot) : null
  }

  const handleCopyLink = async (playerName: string) => {
    const shareUrl = getShareUrl(playerName)

    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyFeedbackFor(playerName)
      setOpenShareMenuFor(null)
    } catch {
      window.prompt('Copy this profile link', shareUrl)
    }
  }

  const handleWhatsappShare = (playerName: string) => {
    const shareUrl = getShareUrl(playerName)

    if (!shareUrl) return

    const message = `Here is your Poker Tracker profile: ${shareUrl}`
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setOpenShareMenuFor(null)
  }

  return (
    <div className="board">
      <section className="column glass-panel">
        <div className="column-header">
          <div>
            <p className="eyebrow">Profiles</p>
            <h2>Open or share any player profile</h2>
            <p>Use Share to send a read-only snapshot by link or WhatsApp.</p>
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
                      <span className="profile-label">ROI</span>
                      <span>{formatPercent(player.roi)}</span>
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      className="ghost-button profile-card-cta"
                      onClick={() => {
                        onSelectPlayer?.(player.name)
                        onOpenProfile?.(player.name)
                      }}
                    >
                      View profile
                    </button>
                    <div className="profile-share-group">
                      <button
                        type="button"
                        className="ghost-button profile-share-button"
                        onClick={() =>
                          setOpenShareMenuFor((current) =>
                            current === player.name ? null : player.name,
                          )
                        }
                      >
                        Share
                      </button>
                      {openShareMenuFor === player.name ? (
                        <div className="profile-share-menu glass-panel">
                          <button
                            type="button"
                            className="profile-link"
                            onClick={() => void handleCopyLink(player.name)}
                          >
                            Copy link
                          </button>
                          <button
                            type="button"
                            className="profile-link"
                            onClick={() => handleWhatsappShare(player.name)}
                          >
                            Share to WhatsApp
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {copyFeedbackFor === player.name ? (
                    <p className="share-feedback">Link copied.</p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProfilesBoard
