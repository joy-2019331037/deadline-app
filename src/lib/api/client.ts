import { env } from '../../config/env.ts';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorBody = { error?: { code?: unknown; message?: unknown; details?: unknown } };

function toDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ApiErrorDetail =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ApiErrorDetail).path === 'string' &&
      typeof (item as ApiErrorDetail).message === 'string',
  );
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  const code = typeof body?.error?.code === 'string' ? body.error.code : 'HTTP_ERROR';
  const message =
    typeof body?.error?.message === 'string'
      ? body.error.message
      : `Request failed with status ${res.status}`;
  return new ApiError(res.status, code, message, toDetails(body?.error?.details));
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token, signal } = options;

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server');
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
