import type { GameStateDto, NegotiationDto, NegotiationView, SquadReport } from '../api/types.ts';

export function negotiationView(
  overrides: Partial<NegotiationView> = {},
  negotiation: Partial<NegotiationDto> = {},
): NegotiationView {
  return {
    negotiation: {
      id: 'n1',
      playerId: 'p1',
      agentId: 'a1',
      sellingClubId: 'c1',
      status: 'CONTACTED',
      failureReason: null,
      offers: [],
      counteroffers: [],
      proposedTerms: null,
      agreedTerms: null,
      promiseIds: [],
      startedAtGameHour: 2,
      expiresAtGameHour: 98,
      lastInteractionAtGameHour: 2,
      version: 0,
      ...negotiation,
    },
    player: {
      id: 'p1',
      name: 'Alejandro Moreno',
      nationality: 'Spain',
      age: 26,
      position: 'ST',
      rating: 86,
      stats: { appearances: 31, goals: 22, assists: 4, cleanSheets: 0 },
      currentClubId: 'c1',
      contractYearsRemaining: 2,
      marketValue: 58_000_000,
      playingStyle: 'Clinical poacher',
      agentId: 'a1',
      availabilityState: 'AVAILABLE',
    },
    agent: {
      id: 'a1',
      name: 'Victor Kane',
      agency: 'Kane Sports Management',
      publicReputation: 'Never leaves money on the table.',
      relationshipStatus: 'NEUTRAL',
    },
    club: {
      id: 'c1',
      name: 'Valdoria CF',
      shortName: 'VAL',
      country: 'Spain',
      league: 'Liga Primera',
      prestige: 2,
      isUserClub: false,
    },
    messages: [
      {
        id: 'm1',
        negotiationId: 'n1',
        speaker: 'AGENT',
        content: "You want Alejandro Moreno? Then you already know he isn't cheap.",
        tone: 'demanding',
        intent: 'greeting',
        createdAtGameHour: 2,
      },
    ],
    agentMood: 'RECEPTIVE',
    outcomeNarrative: null,
    ...overrides,
  };
}

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

export function squadReport(overrides: Partial<SquadReport['analysis']> = {}): SquadReport {
  return {
    players: [
      {
        id: 'p-cole',
        name: 'Harry Cole',
        nationality: 'England',
        age: 31,
        position: 'ST',
        rating: 69,
        stats: { appearances: 30, goals: 6, assists: 2, cleanSheets: 0 },
        currentClubId: 'club-1',
        contractYearsRemaining: 1,
        marketValue: 4_000_000,
        playingStyle: 'Target man',
        agentId: 'agent-1',
        availabilityState: 'AVAILABLE',
        weeklyWage: 100_000,
      },
    ],
    analysis: {
      ratings: {
        attack: 'AVERAGE',
        midfield: 'STRONG',
        defence: 'AVERAGE',
        depth: 'POOR',
        ageProfile: 'AGING',
      },
      weaknesses: ['NO_RELIABLE_STRIKER', 'AGING_DEFENCE', 'THIN_SQUAD', 'HIGH_WAGE_BILL'],
      squadSize: 16,
      averageAge: 27.4,
      startingAverageAge: 29.1,
      startingElevenIds: ['p-cole'],
      wages: { totalWeekly: 1_422_000, averageWeekly: 88_875, highestWeekly: 150_000 },
      contracts: { expiringPlayerIds: ['p-cole'], byYearsRemaining: [{ years: 1, count: 4 }] },
      ...overrides,
    },
  };
}
