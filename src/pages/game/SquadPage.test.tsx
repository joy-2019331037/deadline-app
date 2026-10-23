import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SquadPlayerDto } from '../../api/types.ts';
import { useSessionStore } from '../../stores/sessionStore.ts';
import { GAME_ID, gameState, squadReport, TOKEN } from '../../test/fixtures.ts';
import { mockApi } from '../../test/mockApi.ts';
import { renderRoute } from '../../test/render.tsx';

const base = squadReport().players[0] as SquadPlayerDto;
const player = (overrides: Partial<SquadPlayerDto>): SquadPlayerDto => ({ ...base, ...overrides });

function renderSquad(report = squadReport()) {
  useSessionStore.setState({ session: { gameId: GAME_ID, token: TOKEN } });
  mockApi({
    [`GET /games/${GAME_ID}`]: { body: { game: gameState() } },
    [`GET /games/${GAME_ID}/squad`]: { body: report },
  });
  renderRoute('/game/squad');
}

describe('SquadPage', () => {
  it('groups players by position and marks starters and expiring contracts', async () => {
    const report = squadReport();
    report.players = [
      player({ id: 'gk', name: 'Tom Hadley', position: 'GK', contractYearsRemaining: 2 }),
      player({ id: 'cb', name: 'Graham Stokes', position: 'CB', age: 34 }),
      player({ id: 'st', name: 'Harry Cole', position: 'ST' }),
    ];
    report.analysis.startingElevenIds = ['gk', 'st'];
    report.analysis.contracts.expiringPlayerIds = ['cb'];

    renderSquad(report);

    const defenders = await screen.findByRole('region', { name: 'Defenders (1)' });
    expect(within(defenders).getByRole('link', { name: 'Graham Stokes' })).toHaveAttribute(
      'href',
      '/game/players/cb',
    );
    expect(within(defenders).getByText('1 yr')).toHaveAttribute('data-expiring', 'true');
    expect(screen.getByRole('region', { name: 'Midfielders (0)' })).toHaveTextContent('No players');
    const goalkeepers = screen.getByRole('region', { name: 'Goalkeepers (1)' });
    expect(within(goalkeepers).getByText('Starter')).toBeInTheDocument();
    expect(within(goalkeepers).getByText('£100K/wk')).toBeInTheDocument();
  });

  it('shows qualitative ratings, weaknesses, wages, and board priorities', async () => {
    renderSquad();

    const strengths = await screen.findByRole('region', { name: 'Strengths' });
    expect(within(strengths).getByText('Poor')).toHaveAttribute('data-strength', 'POOR');
    expect(within(strengths).getByText('Aging (XI avg 29.1)')).toBeInTheDocument();
    expect(screen.getByText('Weak squad depth')).toBeInTheDocument();
    expect(screen.getByText('£1.4M/wk')).toBeInTheDocument();
    expect(screen.getByText('£320K/wk')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Board priorities' })).getByRole('listitem'),
    ).toHaveTextContent('Strengthen the attack');
  });

  it('does not show raw rating numbers for squad areas', async () => {
    renderSquad();

    const strengths = await screen.findByRole('region', { name: 'Strengths' });
    const areaValues = within(strengths)
      .getAllByRole('definition')
      .filter((value) => value.hasAttribute('data-strength'));
    expect(areaValues).toHaveLength(4);
    areaValues.forEach((value) => expect(value.textContent).not.toMatch(/\d/));
  });
});
