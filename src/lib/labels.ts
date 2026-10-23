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
    default:
      return 'Something happened in the market.';
  }
}
