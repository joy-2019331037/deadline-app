import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api/client.ts';
import { gameKeys, useGameQuery, useRequiredSession } from './games.ts';
import type {
  ContractTerms,
  GameStateDto,
  NegotiationActionResponse,
  NegotiationList,
  NegotiationStatus,
  NegotiationView,
  PromiseDto,
  PromiseType,
  Tactic,
} from './types.ts';

const ACTIVE_STATUSES: ReadonlySet<NegotiationStatus> = new Set([
  'CONTACTED',
  'INFORMATION_GATHERING',
  'NEGOTIATING',
  'TERMS_AGREED',
  'MEDICAL_PENDING',
]);

export function isActiveNegotiation(status: NegotiationStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export const negotiationKeys = {
  all: (gameId: string) => ['games', gameId, 'negotiations'] as const,
  detail: (gameId: string, negotiationId: string) =>
    ['games', gameId, 'negotiations', negotiationId] as const,
};

export function useNegotiations() {
  return useGameQuery<NegotiationList>(negotiationKeys.all, '/negotiations');
}

export function useNegotiation(negotiationId: string) {
  return useGameQuery<NegotiationView>(
    (gameId) => negotiationKeys.detail(gameId, negotiationId),
    `/negotiations/${negotiationId}`,
  );
}

function currentVersion(queryClient: QueryClient, gameId: string): number {
  return queryClient.getQueryData<{ game: GameStateDto }>(gameKeys.state(gameId))?.game.version ?? 0;
}

function useNegotiationMutation<Input>(toRequest: (input: Input) => { path: string; body: object }) {
  const queryClient = useQueryClient();
  const { gameId, token } = useRequiredSession();

  return useMutation({
    mutationFn: (input: Input) => {
      const { path, body } = toRequest(input);
      return apiRequest<NegotiationActionResponse>(`/games/${gameId}/negotiations${path}`, {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: { ...body, expectedVersion: currentVersion(queryClient, gameId) },
      });
    },
    onSuccess: (response) => {
      const view: NegotiationView = {
        negotiation: response.negotiation,
        player: response.player,
        agent: response.agent,
        club: response.club,
        messages: response.messages,
        agentMood: response.agentMood,
        outcomeNarrative: response.outcomeNarrative,
        claims: response.claims,
        promises: response.promises,
      };
      queryClient.setQueryData(gameKeys.state(gameId), { game: response.game });
      queryClient.setQueryData(negotiationKeys.detail(gameId, view.negotiation.id), view);
      void queryClient.invalidateQueries({ queryKey: negotiationKeys.all(gameId), exact: true });
      void queryClient.invalidateQueries({ queryKey: gameKeys.events(gameId) });
      void queryClient.invalidateQueries({ queryKey: ['games', gameId, 'players'] });
      void queryClient.invalidateQueries({ queryKey: gameKeys.squad(gameId) });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        void queryClient.invalidateQueries({ queryKey: gameKeys.state(gameId) });
      }
    },
  });
}

export function useContactAgent() {
  return useNegotiationMutation((playerId: string) => ({ path: '', body: { playerId } }));
}

export type NegotiationCommand =
  | { kind: 'offer'; terms: ContractTerms }
  | { kind: 'message'; content: string }
  | { kind: 'walk-away' }
  | { kind: 'promise'; promiseType: PromiseType }
  | { kind: 'call-bluff' }
  | { kind: 'ask-details' }
  | { kind: 'tactic'; tactic: Tactic };

export function useNegotiationCommand(negotiationId: string) {
  return useNegotiationMutation((command: NegotiationCommand) => {
    switch (command.kind) {
      case 'offer':
        return { path: `/${negotiationId}/offers`, body: { terms: command.terms } };
      case 'message':
        return { path: `/${negotiationId}/messages`, body: { content: command.content } };
      case 'walk-away':
        return { path: `/${negotiationId}/actions`, body: { action: { type: 'WALK_AWAY' } } };
      case 'promise':
        return { path: `/${negotiationId}/promises`, body: { promiseType: command.promiseType } };
      case 'call-bluff':
        return { path: `/${negotiationId}/actions`, body: { action: { type: 'CALL_BLUFF' } } };
      case 'ask-details':
        return { path: `/${negotiationId}/actions`, body: { action: { type: 'ASK_FOR_DETAILS' } } };
      case 'tactic':
        return {
          path: `/${negotiationId}/actions`,
          body: { action: { type: 'TACTIC', tactic: command.tactic } },
        };
    }
  });
}

export function useActiveNegotiationFor(playerId: string) {
  const { data } = useNegotiations();
  return data?.negotiations.find(
    (negotiation) => negotiation.playerId === playerId && isActiveNegotiation(negotiation.status),
  );
}

export function usePromises() {
  return useGameQuery<{ promises: PromiseDto[]; players: { id: string; name: string }[] }>(
    (gameId) => ['games', gameId, 'promises'],
    '/promises',
  );
}
