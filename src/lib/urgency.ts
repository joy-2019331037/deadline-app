export type Urgency = 'calm' | 'pressing' | 'critical';

/** Under three days the window feels pressing; under a day it is critical. */
export function urgencyOf(remainingHours: number): Urgency {
  if (remainingHours <= 24) return 'critical';
  if (remainingHours <= 72) return 'pressing';
  return 'calm';
}
