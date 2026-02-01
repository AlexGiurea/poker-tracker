import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Column, Player, Session } from '../types/poker'
import PlayerCard from './PlayerCard'

type BoardProps = {
  session: Session
  onSessionChange: (session: Session) => void
  onPlayerUpdate: (playerId: string, updates: Partial<Player>) => void
  onViewProfile?: (playerName: string) => void
}

const findColumnByPlayer = (columns: Column[], playerId: string) =>
  columns.find((column) => column.playerIds.includes(playerId))

const Board = ({
  session,
  onSessionChange,
  onPlayerUpdate,
  onViewProfile,
}: BoardProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const playerMap = session.players

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) return

    const activeColumn = findColumnByPlayer(session.columns, activeId)
    if (!activeColumn) return

    const overColumn =
      session.columns.find((column) => column.id === overId) ??
      findColumnByPlayer(session.columns, overId)

    if (!overColumn) return

    if (activeColumn.id === overColumn.id) {
      const oldIndex = activeColumn.playerIds.indexOf(activeId)
      const newIndex = overColumn.playerIds.indexOf(overId)
      if (newIndex === -1) return

      const reordered = arrayMove(activeColumn.playerIds, oldIndex, newIndex)
      const nextColumns = session.columns.map((column) =>
        column.id === activeColumn.id
          ? { ...column, playerIds: reordered }
          : column,
      )

      onSessionChange({ ...session, columns: nextColumns })
      return
    }

    const nextColumns = session.columns.map((column) => {
      if (column.id === activeColumn.id) {
        return {
          ...column,
          playerIds: column.playerIds.filter((id) => id !== activeId),
        }
      }

      if (column.id === overColumn.id) {
        const overIndex = column.playerIds.indexOf(overId)
        const insertAt = overIndex === -1 ? column.playerIds.length : overIndex
        const nextIds = [...column.playerIds]
        nextIds.splice(insertAt, 0, activeId)
        return { ...column, playerIds: nextIds }
      }

      return column
    })

    onSessionChange({ ...session, columns: nextColumns })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        {session.columns.map((column) => (
          <ColumnSection
            key={column.id}
            column={column}
            players={column.playerIds.map((id) => playerMap[id])}
            onPlayerUpdate={onPlayerUpdate}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
    </DndContext>
  )
}

type ColumnSectionProps = {
  column: Column
  players: Player[]
  onPlayerUpdate: (playerId: string, updates: Partial<Player>) => void
  onViewProfile?: (playerName: string) => void
}

const ColumnSection = ({
  column,
  players,
  onPlayerUpdate,
  onViewProfile,
}: ColumnSectionProps) => {
  const { setNodeRef } = useDroppable({ id: column.id })
  return (
    <section
      className={`column ${column.id === 'settled' ? 'column-settled' : ''}`}
    >
      <div className="column-header">
        <div>
          <h2>{column.title}</h2>
          <p>{players.length} players</p>
        </div>
      </div>

      <SortableContext
        items={column.playerIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-body" ref={setNodeRef}>
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onUpdate={onPlayerUpdate}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

export default Board
