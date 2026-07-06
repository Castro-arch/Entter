/**
 * Typed client for the Entter backend API.
 *
 * The organizer dashboard is a client-side SPA that talks to the NestJS API on
 * a separate origin and authenticates with the httpOnly `access_token` cookie.
 * Every request therefore sends credentials; the cookie is never read from JS.
 */

export type UserRole = 'OWNER' | 'STAFF';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterInput {
  tenantName: string;
  subdomain: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Error carrying the HTTP status and a human-readable message from the API. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('Unable to reach the server. Is the API running?', 0);
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }

  // 204 No Content and empty bodies have nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** NestJS error bodies expose `message` as a string or an array of strings. */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  } catch {
    // No JSON body — fall through to a generic message.
  }
  return `Request failed with status ${response.status}`;
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: LoginInput) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
};
