import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api/client.ts';
import { useSessionStore, type GameSessionCredential } from '../stores/sessionStore.ts';
import type {
  ActionResponse,
  CreateGameResponse,
  GameAction,
  GameEventDto,
  GameStateDto,
  MarketResponse,
  PlayerProfile,
  Position,
  SquadReport,
} from './types.ts';

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

export function useSquad() {
  return useGameQuery<SquadReport>(gameKeys.squad, '/squad');
}

export interface MarketFilters {
  position?: Position;
  minAge?: number;
  maxAge?: number;
  maxValue?: number;
  clubId?: string;
  search?: string;
  sort?: 'rating' | 'marketValue' | 'age' | 'name';
  order?: 'asc' | 'desc';
}

export function toQueryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useMarket(filters: MarketFilters) {
  const { gameId, token } = useRequiredSession();
  return useQuery({
    queryKey: gameKeys.market(gameId, { ...filters }),
    queryFn: ({ signal }) =>
      apiRequest<MarketResponse>(`/games/${gameId}/market${toQueryString({ ...filters })}`, {
        token,
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function usePlayerProfile(playerId: string) {
  return useGameQuery<PlayerProfile>((gameId) => gameKeys.player(gameId, playerId), `/players/${playerId}`);
}

export function useGameAction() {
  const queryClient = useQueryClient();
  const { gameId, token } = useRequiredSession();

  return useMutation({
    mutationFn: (action: GameAction) => {
      const current = queryClient.getQueryData<{ game: GameStateDto }>(gameKeys.state(gameId));
      return apiRequest<ActionResponse>(`/games/${gameId}/actions`, {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: { expectedVersion: current?.game.version ?? 0, action },
      });
    },
    onSuccess: ({ game }) => {
      queryClient.setQueryData(gameKeys.state(gameId), { game });
      void queryClient.invalidateQueries({ queryKey: gameKeys.events(gameId) });
      void queryClient.invalidateQueries({ queryKey: ['games', gameId, 'players'] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        void queryClient.invalidateQueries({ queryKey: gameKeys.state(gameId) });
      }
    },
  });
}

export function isLostSessionError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 404);
}
