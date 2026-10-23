import { useGameCommand, useGameQuery } from './games.ts';
import type { GameCommandResponse, MediaAction, RumorFeed } from './types.ts';

export function useRumors() {
  return useGameQuery<RumorFeed>((gameId) => ['games', gameId, 'rumors'], '/rumors?limit=50');
}

export function useInvestigateRumor() {
  return useGameCommand<string, GameCommandResponse>((rumorId) => ({
    path: `/rumors/${rumorId}/investigate`,
  }));
}

export function useMediaStatement() {
  return useGameCommand<{ action: MediaAction; playerId: string }, GameCommandResponse>((input) => ({
    path: '/media',
    body: input,
  }));
}
