import type { BoardData, Session } from '../types/poker'

const buildSession = (
  id: string,
  label: string,
  players: { id: string; name: string; paid: number; chipValue: number }[],
): Session => {
  const playerMap = Object.fromEntries(
    players.map((player) => [player.id, player]),
  )

  return {
    id,
    label,
    players: playerMap,
    columns: [
      {
        id: 'settled',
        title: 'Settled',
        playerIds: players.map((player) => player.id),
      },
    ],
  }
}

export const seedData: BoardData = {
  sessions: [
    buildSession('day-1', 'Day 1', [
      { id: 'day1-alex', name: 'Alex', paid: 17, chipValue: 2 },
      { id: 'day1-mathias', name: 'Mathias', paid: 6, chipValue: 17.7 },
      { id: 'day1-joel', name: 'Joel', paid: 6, chipValue: 22.8 },
      { id: 'day1-sandro', name: 'Sandro', paid: 14, chipValue: 0 },
      { id: 'day1-mathis', name: 'Mathis', paid: 6, chipValue: 0 },
      { id: 'day1-luis', name: 'Luis', paid: 6, chipValue: 11.45 },
    ]),
    buildSession('day-2', 'Day 2', [
      { id: 'day2-jakub', name: 'Jakub', paid: 6, chipValue: 11.25 },
      { id: 'day2-mathias', name: 'Mathias', paid: 6, chipValue: 0 },
      { id: 'day2-alex', name: 'Alex', paid: 6, chipValue: 11.9 },
      { id: 'day2-ethan', name: 'Ethan', paid: 6, chipValue: 7 },
      { id: 'day2-hugo', name: 'Hugo', paid: 6, chipValue: 5 },
      { id: 'day2-sandro', name: 'Sandro', paid: 6, chipValue: 0 },
    ]),
    buildSession('day-3', 'Day 3', [
      { id: 'day3-alex', name: 'Alex', paid: 6, chipValue: 9.3 },
      { id: 'day3-dani', name: 'Dani', paid: 6, chipValue: 23 },
      { id: 'day3-mathias', name: 'Mathias', paid: 12, chipValue: 0 },
      { id: 'day3-joel', name: 'Joel', paid: 6, chipValue: 2 },
      { id: 'day3-hugo', name: 'Hugo', paid: 12, chipValue: 7.6 },
    ]),
    buildSession('day-4', 'Day 4', [
      { id: 'day4-alex', name: 'Alex', paid: 12, chipValue: 7 },
      { id: 'day4-joel', name: 'Joel', paid: 12, chipValue: 12 },
      { id: 'day4-sandro', name: 'Sandro', paid: 6, chipValue: 18.2 },
      { id: 'day4-mathias', name: 'Mathias', paid: 12, chipValue: 0 },
      { id: 'day4-hugo', name: 'Hugo', paid: 6, chipValue: 1.4 },
      { id: 'day4-jakub', name: 'Jakub', paid: 6, chipValue: 13.3 },
    ]),
    buildSession('day-5', 'Day 5', [
      { id: 'day5-sandro', name: 'Sandro', paid: 18, chipValue: 0 },
      { id: 'day5-alex', name: 'Alex', paid: 6, chipValue: 21.5 },
      { id: 'day5-hugo', name: 'Hugo', paid: 6, chipValue: 14.2 },
      { id: 'day5-mathias', name: 'Mathias', paid: 6, chipValue: 0 },
    ]),
  ],
}
