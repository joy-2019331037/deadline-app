import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client.ts';

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequest', () => {
  it('prefixes the versioned base URL and returns JSON', async () => {
    const fetchMock = mockFetch(Response.json({ status: 'ok' }));

    await expect(apiRequest('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/health', expect.any(Object));
  });

  it('serializes JSON bodies', async () => {
    const fetchMock = mockFetch(Response.json({}));

    await apiRequest('/games', { method: 'POST', body: { club: 'x' } });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: '{"club":"x"}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('maps server error bodies to ApiError', async () => {
    mockFetch(Response.json({ error: { code: 'NOT_FOUND', message: 'Game not found' } }, { status: 404 }));

    await expect(apiRequest('/games/1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: 'Game not found',
    });
  });

  it('falls back when the error body is not JSON', async () => {
    mockFetch(new Response('oops', { status: 502 }));

    await expect(apiRequest('/health')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const error = await apiRequest('/health').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
