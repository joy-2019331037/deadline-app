import type { MarketFilters } from '../../api/games.ts';
import { POSITIONS, type Position } from '../../api/types.ts';

export const MARKET_SORTS = [
  { value: 'rating', label: 'Rating' },
  { value: 'marketValue', label: 'Value' },
  { value: 'age', label: 'Age' },
  { value: 'name', label: 'Name' },
] as const;

function intParam(params: URLSearchParams, key: string): number | undefined {
  const value = Number.parseInt(params.get(key) ?? '', 10);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function readFilters(params: URLSearchParams): MarketFilters {
  const filters: MarketFilters = {};
  const position = params.get('position');
  if (position && (POSITIONS as readonly string[]).includes(position))
    filters.position = position as Position;
  const minAge = intParam(params, 'minAge');
  if (minAge !== undefined) filters.minAge = minAge;
  const maxAge = intParam(params, 'maxAge');
  if (maxAge !== undefined) filters.maxAge = maxAge;
  const maxValue = intParam(params, 'maxValue');
  if (maxValue !== undefined) filters.maxValue = maxValue;
  const clubId = params.get('clubId');
  if (clubId) filters.clubId = clubId;
  const search = params.get('search')?.trim();
  if (search) filters.search = search.slice(0, 50);
  const sort = MARKET_SORTS.find((option) => option.value === params.get('sort'));
  if (sort) filters.sort = sort.value;
  const order = params.get('order');
  if (order === 'asc' || order === 'desc') filters.order = order;
  return filters;
}
