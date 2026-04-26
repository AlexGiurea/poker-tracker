import { calculateProfit, type BoardData, type Session } from '../types/poker'

type SessionPlayerRecord = {
  name: string
  paid: number
  chipValue: number
}

type SessionRecord = {
  id: string
  label: string
  date: string
  notes: string
  players: SessionPlayerRecord[]
}

export type PlayerResultRow = {
  id: string
  sessionId: string
  sessionLabel: string
  sessionDate: string
  playerName: string
  paid: number
  chipValue: number
  profit: number
}

export type PlayerSessionInfo = {
  id: string
  label: string
  date: string
  notes: string
}

const toPlayerId = (sessionId: string, name: string) =>
  `${sessionId.replace(/-/g, '')}-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`

const buildBoardSession = (record: SessionRecord): Session => {
  const players = Object.fromEntries(
    record.players.map((player) => {
      const id = toPlayerId(record.id, player.name)
      return [
        id,
        {
          id,
          name: player.name,
          paid: player.paid,
          chipValue: player.chipValue,
        },
      ] as const
    }),
  )

  return {
    id: record.id,
    label: record.label,
    players,
    columns: [
      {
        id: 'settled',
        title: 'Settled',
        playerIds: Object.keys(players),
      },
    ],
  }
}

const buildRows = (records: SessionRecord[]): PlayerResultRow[] =>
  records.flatMap((record) =>
    record.players.map((player) => ({
      id: toPlayerId(record.id, player.name),
      sessionId: record.id,
      sessionLabel: record.label,
      sessionDate: record.date,
      playerName: player.name,
      paid: player.paid,
      chipValue: player.chipValue,
      profit: calculateProfit({
        id: toPlayerId(record.id, player.name),
        name: player.name,
        paid: player.paid,
        chipValue: player.chipValue,
      }),
    })),
  )

// A few source rows omitted a buy-in/cashout value or had inconsistent arithmetic.
// When a row includes only a single numeric value after the player name, that
// value is treated as the already-calculated profit rather than a cashout total.
// Stored values prioritize explicit paid/cashout amounts and keep the existing
// inference pattern for incomplete rows.
export const sessionRecords: SessionRecord[] = [
  {
    id: 'day-1',
    label: 'Day 1',
    date: '2026-01-10',
    notes: 'Season opener with six players.',
    players: [
      { name: 'Alex', paid: 17, chipValue: 2 },
      { name: 'Mathias', paid: 6, chipValue: 17.7 },
      { name: 'Joel', paid: 6, chipValue: 22.8 },
      { name: 'Sandro', paid: 14, chipValue: 0 },
      { name: 'Mathis', paid: 6, chipValue: 0 },
      { name: 'Luis', paid: 6, chipValue: 11.45 },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    date: '2026-01-12',
    notes: 'Quick rebuy night with tight stacks.',
    players: [
      { name: 'Jakub', paid: 6, chipValue: 11.25 },
      { name: 'Mathias', paid: 6, chipValue: 0 },
      { name: 'Alex', paid: 6, chipValue: 11.9 },
      { name: 'Ethan', paid: 6, chipValue: 7 },
      { name: 'Hugo', paid: 6, chipValue: 5 },
      { name: 'Sandro', paid: 6, chipValue: 0 },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    date: '2026-01-17',
    notes: 'High chip counts and a big winner.',
    players: [
      { name: 'Alex', paid: 6, chipValue: 9.3 },
      { name: 'Dani', paid: 6, chipValue: 23 },
      { name: 'Mathias', paid: 12, chipValue: 0 },
      { name: 'Joel', paid: 6, chipValue: 2 },
      { name: 'Hugo', paid: 12, chipValue: 7.6 },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4',
    date: '2026-01-24',
    notes: 'Balanced table with close finishes.',
    players: [
      { name: 'Alex', paid: 12, chipValue: 7 },
      { name: 'Joel', paid: 12, chipValue: 12 },
      { name: 'Sandro', paid: 6, chipValue: 18.2 },
      { name: 'Mathias', paid: 12, chipValue: 0 },
      { name: 'Hugo', paid: 6, chipValue: 1.4 },
      { name: 'Jakub', paid: 6, chipValue: 13.3 },
    ],
  },
  {
    id: 'day-5',
    label: 'Day 5',
    date: '2026-01-31',
    notes: 'Short-handed finale with sharp swings.',
    players: [
      { name: 'Sandro', paid: 6, chipValue: -12 },
      { name: 'Alex', paid: 6, chipValue: 21.5 },
      { name: 'Hugo', paid: 6, chipValue: 14.2 },
      { name: 'Mathias', paid: 6, chipValue: 0 },
    ],
  },
  {
    id: 'day-6',
    label: 'Day 6',
    date: '2026-02-07',
    notes: 'Fresh faces and tight margins.',
    players: [
      { name: 'Alex', paid: 9, chipValue: 9.9 },
      { name: 'Hugo', paid: 6, chipValue: 10.25 },
      { name: 'Dani', paid: 6, chipValue: 6 },
      { name: 'Mathias', paid: 12, chipValue: 9.15 },
      { name: 'Pato', paid: 6, chipValue: 3.95 },
    ],
  },
  {
    id: 'day-7',
    label: 'Day 7',
    date: '2026-02-14',
    notes: 'Compact table with fast rounds.',
    players: [
      { name: 'Alex', paid: 6, chipValue: 6.8 },
      { name: 'Hugo', paid: 6, chipValue: 5.3 },
      { name: 'Mathias', paid: 6, chipValue: 6.9 },
    ],
  },
  {
    id: 'day-8',
    label: 'Day 8',
    date: '2026-02-21',
    notes: 'Big swings with a strong finish.',
    players: [
      { name: 'Ronan', paid: 12, chipValue: 0 },
      { name: 'Alex', paid: 6, chipValue: 3.2 },
      { name: 'Hugo', paid: 6, chipValue: 5.7 },
      { name: 'Mathias', paid: 6, chipValue: 16.45 },
      { name: 'Dani', paid: 12, chipValue: 16.6 },
    ],
  },
  {
    id: 'day-9',
    label: 'Day 9',
    date: '2026-02-28',
    notes: '',
    players: [
      { name: 'Joel', paid: 12, chipValue: 3.5 },
      { name: 'Alex', paid: 12, chipValue: 16 },
      { name: 'Dani', paid: 6, chipValue: 18.5 },
      { name: 'Mathias', paid: 6, chipValue: 15 },
      { name: 'Hugo', paid: 6, chipValue: 4.1 },
      { name: 'Luis', paid: 15, chipValue: 0 },
    ],
  },
  {
    id: 'day-10',
    label: 'Day 10',
    date: '2026-03-07',
    notes: '',
    players: [
      { name: 'Brixten', paid: 12, chipValue: 4 },
      { name: 'Sandro', paid: 14, chipValue: 14 },
      { name: 'Mathias', paid: 6, chipValue: 15.75 },
      { name: 'Hugo', paid: 6, chipValue: 8.5 },
      { name: 'Dani', paid: 6, chipValue: 39 },
      { name: 'Alexis', paid: 17, chipValue: 0 },
      { name: 'Alex', paid: 18, chipValue: 20.7 },
      { name: 'Ethan', paid: 12, chipValue: 11.3 },
    ],
  },
  {
    id: 'day-11',
    label: 'Day 11',
    date: '2026-03-14',
    notes: '',
    players: [
      { name: 'Alex', paid: 12, chipValue: 26 },
      { name: 'Brixten', paid: 6, chipValue: 18.1 },
      { name: 'Alexis', paid: 12, chipValue: 18 },
      { name: 'Hugo', paid: 6, chipValue: 9.55 },
      { name: 'Mathias', paid: 9.45, chipValue: 0 },
      { name: 'Sandro', paid: 12, chipValue: 0 },
      { name: 'Dani', paid: 12, chipValue: 0 },
    ],
  },
  {
    id: 'day-12',
    label: 'Day 12',
    date: '2026-03-21',
    notes: '',
    players: [
      { name: 'Alexis', paid: 6, chipValue: 7.15 },
      { name: 'Mathias', paid: 6, chipValue: 5.65 },
      { name: 'Hugo', paid: 6, chipValue: 7 },
      { name: 'Alex', paid: 6, chipValue: 4.25 },
    ],
  },
  {
    id: 'day-13',
    label: 'Day 13',
    date: '2026-03-28',
    notes: '',
    players: [
      { name: 'Alex', paid: 6, chipValue: 7.95 },
      { name: 'Mathias', paid: 6, chipValue: 4.6 },
      { name: 'Alexis', paid: 6, chipValue: 11.45 },
      { name: 'Hugo', paid: 6, chipValue: 0 },
    ],
  },
  {
    id: 'day-14',
    label: 'Day 14',
    date: '2026-04-04',
    notes: '',
    players: [
      { name: 'Alexis', paid: 6, chipValue: 10.65 },
      { name: 'Dani', paid: 6, chipValue: 18 },
      { name: 'Hugo', paid: 6, chipValue: 3 },
      { name: 'Mathias', paid: 12, chipValue: 1.45 },
      { name: 'Alex', paid: 15, chipValue: 14.15 },
    ],
  },
  {
    id: 'day-15',
    label: 'Day 15',
    date: '2026-04-11',
    notes: '',
    players: [
      { name: 'Alex', paid: 18, chipValue: 7.55 },
      { name: 'Mathias', paid: 6, chipValue: 16.65 },
      { name: 'Hugo', paid: 6, chipValue: 10.85 },
      { name: 'Alexis', paid: 6, chipValue: 7 },
      { name: 'Dani', paid: 6, chipValue: 6 },
    ],
  },
  {
    id: 'day-16',
    label: 'Day 16',
    date: '2026-04-18',
    notes: '',
    players: [
      { name: 'Mathias', paid: 6, chipValue: 8.35 },
      { name: 'Hugo', paid: 6, chipValue: 7 },
      { name: 'Alexis', paid: 6, chipValue: 2.65 },
      { name: 'Alex', paid: 7, chipValue: 5.5 },
      { name: 'Dani', paid: 6, chipValue: 8 },
    ],
  },
  {
    id: 'day-17',
    label: 'Day 17',
    date: '2026-04-25',
    notes: '',
    players: [
      { name: 'Hugo', paid: 6, chipValue: 0 },
      { name: 'Mathias', paid: 6, chipValue: 9.8 },
      { name: 'Alex', paid: 12, chipValue: 3 },
      { name: 'Alexis', paid: 6, chipValue: 17.15 },
    ],
  },
  {
    id: 'day-18',
    label: 'Day 18',
    date: '2026-05-02',
    notes: '',
    players: [
      { name: 'Alexis', paid: 6, chipValue: 13.1 },
      { name: 'Mathias', paid: 6, chipValue: 8.1 },
      { name: 'Hugo', paid: 6, chipValue: 8.1 },
      { name: 'Alex', paid: 13, chipValue: 0 },
    ],
  },
  {
    id: 'day-19',
    label: 'Day 19',
    date: '2026-05-09',
    notes: '',
    players: [
      { name: 'Alexis', paid: 6, chipValue: 7.3 },
      { name: 'Alex', paid: 6, chipValue: 5 },
      { name: 'Mathias', paid: 6, chipValue: 6 },
    ],
  },
  {
    id: 'day-20',
    label: 'Day 20',
    date: '2026-05-16',
    notes: '',
    players: [
      { name: 'Alex', paid: 28, chipValue: 11 },
      { name: 'Alexis', paid: 10, chipValue: 31 },
      { name: 'Dani', paid: 10, chipValue: 0 },
      { name: 'Hugo', paid: 10, chipValue: 13.6 },
      { name: 'Mathias', paid: 10, chipValue: 13.15 },
    ],
  },
  {
    id: 'day-21',
    label: 'Day 21',
    date: '2026-05-23',
    notes: '',
    players: [
      { name: 'Mathias', paid: 6, chipValue: 14.55 },
      { name: 'Alexis', paid: 6, chipValue: 10 },
      { name: 'Alex', paid: 6, chipValue: 7.5 },
      { name: 'Sandro', paid: 6, chipValue: 3.8 },
      { name: 'Dani', paid: 6, chipValue: -6 },
    ],
  },
  {
    id: 'day-22',
    label: 'Day 22',
    date: '2026-05-30',
    notes: '',
    players: [
      { name: 'Mathias', paid: 6, chipValue: 11.7 },
      { name: 'Alexis', paid: 6, chipValue: 6 },
      { name: 'Hugo', paid: 6, chipValue: 0 },
      { name: 'Alex', paid: 12, chipValue: 12.4 },
    ],
  },
  {
    id: 'day-23',
    label: 'Day 23',
    date: '2026-06-06',
    notes: '',
    players: [
      { name: 'Alex', paid: 12, chipValue: 6 },
      { name: 'Mathias', paid: 6, chipValue: 11 },
      { name: 'Alexis', paid: 6, chipValue: 8.5 },
      { name: 'Hugo', paid: 6, chipValue: 3.05 },
    ],
  },
  {
    id: 'day-24',
    label: 'Day 24',
    date: '2026-06-13',
    notes: '',
    players: [
      { name: 'Hugo', paid: 6, chipValue: 3.35 },
      { name: 'Alex', paid: 6, chipValue: 7.5 },
      { name: 'Alexis', paid: 6, chipValue: 9.35 },
      { name: 'Mathias', paid: 6, chipValue: 4 },
    ],
  },
  {
    id: 'day-25',
    label: 'Day 25',
    date: '2026-06-20',
    notes: '',
    players: [
      { name: 'Mathias', paid: 6, chipValue: 4 },
      { name: 'Alex', paid: 10, chipValue: 6.4 },
      { name: 'Alexis', paid: 6, chipValue: 23.55 },
      { name: 'Dani', paid: 6, chipValue: 9 },
    ],
  },
  {
    id: 'day-26',
    label: 'Day 26',
    date: '2026-06-27',
    notes: '',
    players: [
      { name: 'Joel', paid: 6, chipValue: 6 },
      { name: 'Alexis', paid: 18, chipValue: 32.25 },
      { name: 'Hugo', paid: 6, chipValue: 7.2 },
      { name: 'Alex', paid: 18, chipValue: 0 },
      { name: 'Mathias', paid: 6, chipValue: 13.4 },
      { name: 'Dani', paid: 6, chipValue: 0 },
    ],
  },
  {
    id: 'day-27',
    label: 'Day 27',
    date: '2026-07-04',
    notes: '',
    players: [
      { name: 'Alex', paid: 12, chipValue: 6 },
      { name: 'Sandro', paid: 6, chipValue: 11 },
      { name: 'Mathias', paid: 6, chipValue: 10.4 },
      { name: 'Alexis', paid: 6, chipValue: 6.2 },
      { name: 'Hugo', paid: 6, chipValue: 0.6 },
      { name: 'Ethan', paid: 6, chipValue: -8.25 },
      { name: 'Jakub', paid: 6, chipValue: 15.25 },
    ],
  },
]

export const seedData: BoardData = {
  sessions: sessionRecords.map(buildBoardSession),
}

export const playersDatabase: {
  sessions: PlayerSessionInfo[]
  rows: PlayerResultRow[]
} = {
  sessions: sessionRecords.map(({ id, label, date, notes }) => ({
    id,
    label,
    date,
    notes,
  })),
  rows: buildRows(sessionRecords),
}

export const playersResultsCsv = [
  'session_id,session_label,session_date,player_name,paid,chip_value,profit',
  ...playersDatabase.rows.map((row) =>
    [
      row.sessionId,
      row.sessionLabel,
      row.sessionDate,
      row.playerName,
      row.paid,
      row.chipValue,
      row.profit,
    ].join(','),
  ),
].join('\n')
