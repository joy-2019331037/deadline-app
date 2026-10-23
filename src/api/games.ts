import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api/client.ts';
import { useSessionStore, type GameSessionCredential } from '../stores/sessionStore.ts';
import type { CreateGameResponse, GameEventDto, GameStateDto } from './types.ts';

export const gameKeys = {
  all: (gameId: string) => ['games', gameId] as const,
  state: (gameId: string) => ['games', gameId, 'state'] as const,
  events: (gameId: string) => ['games', gameId, 'events'] as const,
  squad: (gameId: string) => ['games', gameId, 'squad'] as const,
  market: (gameId: string, filters: Record<string, unknown>) => ['games', gameId, 'market', filters] as const,
  player: (gameId: string, playerId: string) => ['games', gameId, 'players', playerId] as const,
};

export function useRequiredSession(): GameSessionCredential {
  const session = useSessionStore((state) => state.session);
  if (!session) {
    throw new Error('A game session is required');
  }
  return session;
}

export function useGameQuery<T>(
  key: (gameId: string) => QueryKey,
  path: string,
  options: { refetchInterval?: number } = {},
) {
  const { gameId, token } = useRequiredSession();
  return useQuery({
    queryKey: key(gameId),
    queryFn: ({ signal }) => apiRequest<T>(`/games/${gameId}${path}`, { token, signal }),
    ...options,
  });
}

export function useGame() {
  return useGameQuery<{ game: GameStateDto }>(gameKeys.state, '');
}

export function useGameEvents() {
  return useGameQuery<{ events: GameEventDto[] }>(gameKeys.events, '/events?limit=20');
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);

  return useMutation({
    mutationFn: () => apiRequest<CreateGameResponse>('/games', { method: 'POST' }),
    onSuccess: ({ game, sessionToken }) => {
      setSession({ gameId: game.id, token: sessionToken });
      queryClient.setQueryData(gameKeys.state(game.id), { game });
    },
  });
}

export function isLostSessionError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 404);
}
