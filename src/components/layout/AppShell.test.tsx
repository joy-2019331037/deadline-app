import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderRoute } from '../../test/render.tsx';

describe('AppShell', () => {
  it('renders the home page and shows the server as online', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ status: 'ok' }))),
    );

    renderRoute('/');

    expect(screen.getByRole('heading', { level: 1, name: 'DEADLINE' })).toBeInTheDocument();
    expect(await screen.findByText('Server online')).toBeInTheDocument();
  });

  it('shows the server as offline when the health check fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    renderRoute('/');

    expect(await screen.findByText('Server offline')).toBeInTheDocument();
  });

  it('renders the not-found page for unknown routes', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ status: 'ok' }))),
    );

    renderRoute('/nowhere');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
