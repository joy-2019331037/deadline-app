import type { AvailabilityState, Position } from '../api/types.ts';
import type { Tone } from '../components/ui/primitives.tsx';

const POSITION_TONES: Record<Position, Tone> = {
  GK: 'warning',
  LB: 'info',
  CB: 'info',
  RB: 'info',
  DM: 'success',
  CM: 'success',
  AM: 'success',
  LW: 'danger',
  RW: 'danger',
  ST: 'danger',
};

/** Broadcast-style colour coding: keepers amber, defenders cyan, midfield green, attack red. */
export function positionTone(position: Position): Tone {
  return POSITION_TONES[position];
}

export const AVAILABILITY_TONES: Record<AvailabilityState, Tone> = {
  AVAILABLE: 'success',
  TRANSFER_LISTED: 'accent',
  NOT_FOR_SALE: 'danger',
  TRANSFERRED: 'neutral',
};

/** Ratings above 85 are elite, above 78 strong. */
export function ratingTone(rating: number): Tone {
  if (rating >= 85) return 'accent';
  if (rating >= 78) return 'success';
  if (rating >= 70) return 'info';
  return 'neutral';
}
