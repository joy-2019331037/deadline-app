import { useGameCommand, useGameQuery } from './games.ts';
import type {
  DiscoveredFactDto,
  GameCommandResponse,
  Investigation,
  JournalistDto,
  PlayerProfile,
} from './types.ts';

export function useJournalists() {
  return useGameQuery<{ journalists: JournalistDto[] }>(
    (gameId) => ['games', gameId, 'journalists'],
    '/journalists',
  );
}

export function useScoutPlayer() {
  return useGameCommand<string, GameCommandResponse & { profile: PlayerProfile }>((playerId) => ({
    path: `/players/${playerId}/scout`,
  }));
}

export function useInvestigate() {
  return useGameCommand<Investigation, GameCommandResponse & { facts: DiscoveredFactDto[] }>(
    (investigation) => ({
      path: '/investigations',
      body: { investigation },
    }),
  );
}
