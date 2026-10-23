import type { GameEventDto, SquadWeakness, StrengthLabel } from '../api/types.ts';
import { formatHours, formatMoney } from './format.ts';

export const STRENGTH_TEXT: Record<StrengthLabel, string> = {
  POOR: 'Poor',
  WEAK: 'Weak',
  AVERAGE: 'Average',
  STRONG: 'Strong',
  EXCELLENT: 'Excellent',
};

export const WEAKNESS_TEXT: Record<SquadWeakness, string> = {
  NO_RELIABLE_STRIKER: 'No reliable striker',
  AGING_DEFENCE: 'Aging central defenders',
  THIN_SQUAD: 'Weak squad depth',
  HIGH_WAGE_BILL: 'High wage expenditure',
};

const num = (value: unknown) => (typeof value === 'number' ? value : 0);
const text = (value: unknown, fallback: string) => (typeof value === 'string' && value ? value : fallback);

const OFFER_OUTCOME_TEXT: Record<string, string> = {
  ACCEPTED: 'accepted',
  COUNTERED: 'met with a counteroffer',
  REJECTED: 'rejected',
};

export function describeEvent(event: GameEventDto): string {
  const { payload } = event;
  switch (event.eventType) {
    case 'WINDOW_OPENED':
      return `The transfer window opened with ${formatMoney(num(payload['transferBudget']))} to spend.`;
    case 'WINDOW_CLOSED':
      return 'The transfer window has closed.';
    case 'TIME_ADVANCED':
      return `Time moved on by ${formatHours(num(payload['toHour']) - num(payload['fromHour']))}.`;
    case 'ACTION_WAIT':
      return `You waited ${formatHours(num(payload['hours']))}.`;
    case 'ACTION_SHORTLIST_PLAYER':
      return payload['priority'] === 'BACKUP'
        ? 'You added a backup target to the shortlist.'
        : 'You added a primary target to the shortlist.';
    case 'ACTION_REMOVE_FROM_SHORTLIST':
      return 'You removed a player from the shortlist.';
    case 'ACTION_CONTACT_AGENT':
      return `You opened talks for ${text(payload['playerName'], 'a target')}.`;
    case 'ACTION_SEND_MESSAGE':
      return `You spoke with the agent of ${text(payload['playerName'], 'a target')}.`;
    case 'ACTION_SUBMIT_OFFER':
      return `Your offer for ${text(payload['playerName'], 'a target')} was ${OFFER_OUTCOME_TEXT[text(payload['outcome'], '')] ?? 'considered'}.`;
    case 'ACTION_WALK_AWAY':
      return `You walked away from the deal for ${text(payload['playerName'], 'a target')}.`;
    case 'TRANSFER_COMPLETED':
      return `${text(payload['playerName'], 'A new player')} signed from ${text(payload['fromClub'], 'his club')} for ${formatMoney(num(payload['transferFee']))}.`;
    case 'NEGOTIATION_EXPIRED':
    case 'NEGOTIATION_BROKE_DOWN':
      return text(payload['narrative'], `Talks for ${text(payload['playerName'], 'a target')} have ended.`);
    default:
      return 'Something happened in the market.';
  }
}
