const HOURS_PER_DAY = 24;

export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}K`;
  return `${sign}£${abs}`;
}

export function formatWage(weekly: number): string {
  return `${formatMoney(weekly)}/wk`;
}

export function formatRemaining(hours: number): string {
  const days = Math.floor(hours / HOURS_PER_DAY);
  const rest = hours % HOURS_PER_DAY;
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 'S'}`;
  return `${plural(days, 'DAY')} ${plural(rest, 'HOUR')} REMAINING`;
}

export function formatClockTime(hour: number): string {
  return `${String(hour % HOURS_PER_DAY).padStart(2, '0')}:00`;
}

export function formatGameMoment(gameHour: number): string {
  return `Day ${Math.floor(gameHour / HOURS_PER_DAY) + 1}, ${formatClockTime(gameHour)}`;
}

export function formatHours(hours: number): string {
  if (hours >= HOURS_PER_DAY && hours % HOURS_PER_DAY === 0) {
    const days = hours / HOURS_PER_DAY;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export function humanize(value: string): string {
  const words = value.toLowerCase().split('_');
  return words.map((word, index) => (index === 0 ? word[0]?.toUpperCase() + word.slice(1) : word)).join(' ');
}
