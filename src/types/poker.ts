export type Player = {
  id: string
  name: string
  paid: number
  chipValue: number
}

export type Column = {
  id: string
  title: string
  playerIds: string[]
}

export type Session = {
  id: string
  label: string
  players: Record<string, Player>
  columns: Column[]
}

export type BoardData = {
  sessions: Session[]
}

export const calculateProfit = (player: Player) =>
  Number((player.chipValue - player.paid).toFixed(2))
