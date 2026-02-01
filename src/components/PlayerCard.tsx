import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { Player } from '../types/poker'

type PlayerCardProps = {
  player: Player
  onUpdate: (playerId: string, updates: Partial<Player>) => void
  onViewProfile?: (playerName: string) => void
}

const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const PlayerCard = ({ player, onUpdate, onViewProfile }: PlayerCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const profit = player.chipValue - player.paid
  const handleViewProfile = () => {
    onViewProfile?.(player.name)
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`player-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="player-card-header">
        <div className="name-group">
          <input
            className="name-input"
            value={player.name}
            onChange={(event) => onUpdate(player.id, { name: event.target.value })}
            aria-label="Player name"
          />
          <button
            type="button"
            className="profile-link"
            onClick={handleViewProfile}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={`View ${player.name} profile`}
          >
            View profile
          </button>
        </div>
        <div className="profit-display">
          <span className="profit-label">Profit</span>
          <span className={profit >= 0 ? 'positive' : 'negative'}>
            ${profit.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="player-card-fields">
        <label>
          Paid
          <input
            type="number"
            min="0"
            step="0.01"
            value={player.paid}
            onChange={(event) =>
              onUpdate(player.id, { paid: toNumber(event.target.value) })
            }
          />
        </label>
        <label>
          Chip Value ($)
          <input
            type="number"
            min="0"
            step="0.01"
            value={player.chipValue}
            onChange={(event) =>
              onUpdate(player.id, {
                chipValue: toNumber(event.target.value),
              })
            }
          />
        </label>
      </div>
    </article>
  )
}

export default PlayerCard
