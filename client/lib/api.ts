// Empty by default: the browser calls same-origin /api, which Next.js proxies to the API server.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const LEGACY_TOKEN_KEY = 'ailogracer.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function clearLegacyToken() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // storage unavailable; nothing to clear
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'ailogracer',
        ...(options.body !== undefined && { 'Content-Type': 'application/json' })
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }
  if (res.status === 401) {
    window.dispatchEvent(new Event('ailogracer:logout'));
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
