import { vi } from 'vitest';

type Handler = (request: { url: URL; init: RequestInit }) => { status?: number; body?: unknown } | undefined;

export type ApiRoutes = Record<string, Handler | { status?: number; body?: unknown }>;

export function mockApi(routes: ApiRoutes = {}) {
  const calls: { method: string; path: string; init: RequestInit }[] = [];

  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    calls.push({ method, path: `${path}${url.search}`, init });

    const route =
      routes[`${method} ${path}`] ?? (path === '/health' ? { body: { status: 'ok' } } : undefined);
    const result = typeof route === 'function' ? route({ url, init }) : route;
    if (!result) {
      return Promise.resolve(
        Response.json(
          { error: { code: 'NOT_FOUND', message: `Unmocked ${method} ${path}` } },
          { status: 404 },
        ),
      );
    }
    return Promise.resolve(Response.json(result.body ?? {}, { status: result.status ?? 200 }));
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
