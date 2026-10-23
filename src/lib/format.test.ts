import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatGameMoment,
  formatHours,
  formatMoney,
  formatRemaining,
  humanize,
} from './format.ts';

describe('format helpers', () => {
  it('formats money compactly', () => {
    expect(formatMoney(85_000_000)).toBe('£85M');
    expect(formatMoney(62_500_000)).toBe('£62.5M');
    expect(formatMoney(320_000)).toBe('£320K');
    expect(formatMoney(950)).toBe('£950');
  });

  it('formats remaining time in the spec style', () => {
    expect(formatRemaining(6 * 24 + 12)).toBe('6 DAYS 12 HOURS REMAINING');
    expect(formatRemaining(25)).toBe('1 DAY 1 HOUR REMAINING');
  });

  it('formats game moments and durations', () => {
    expect(formatClockTime(14)).toBe('14:00');
    expect(formatGameMoment(50)).toBe('Day 3, 02:00');
    expect(formatHours(48)).toBe('2 days');
    expect(formatHours(6)).toBe('6 hours');
  });

  it('humanizes enum values', () => {
    expect(humanize('TRANSFER_LISTED')).toBe('Transfer listed');
  });
});
