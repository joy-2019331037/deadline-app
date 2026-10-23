import type { GameStateDto } from '../api/types.ts';

export const GAME_ID = '6650a1b2c3d4e5f6a7b8c9d0';
export const TOKEN = 'test-session-token-abcdefghijklmnopqrstuvwxyz0';

export function gameState(overrides: Partial<GameStateDto> = {}): GameStateDto {
  return {
    id: GAME_ID,
    status: 'ACTIVE',
    club: {
      id: 'club-1',
      name: 'Northbridge United',
      shortName: 'NBU',
      country: 'England',
      league: 'Premier Division',
      prestige: 3,
      isUserClub: true,
    },
    clock: {
      day: 1,
      hour: 0,
      windowLengthDays: 30,
      elapsedHours: 0,
      remainingHours: 720,
      isDeadlineDay: false,
      isWindowClosed: false,
    },
    budgets: { transfer: 85_000_000, wage: 320_000, initialTransfer: 85_000_000, initialWage: 320_000 },
    boardObjectives: [
      {
        key: 'STRENGTHEN_ATTACK',
        description: 'Strengthen the attack with a reliable striker.',
        priority: 5,
        status: 'PENDING',
      },
    ],
    shortlist: [],
    activeNegotiationIds: [],
    signedPlayerIds: [],
    soldPlayerIds: [],
    version: 0,
    ...overrides,
  };
}
