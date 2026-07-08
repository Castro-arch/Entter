/**
 * Typed client for the Entter backend API.
 *
 * The organizer dashboard is a client-side SPA that talks to the NestJS API on
 * a separate origin and authenticates with the httpOnly `access_token` cookie.
 * Every request therefore sends credentials; the cookie is never read from JS.
 */

export type UserRole = 'OWNER' | 'STAFF';

/** Per-area access for STAFF users; ignored (always true in effect) for OWNER. */
export interface Permissions {
  canCheckIn: boolean;
  canCertificates: boolean;
  canFinanceiro: boolean;
  canEventos: boolean;
}

export interface User extends Permissions {
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

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'FINISHED';

export interface EventDay {
  id: string;
  date: string;
  orderIndex: number;
}

export interface TicketType {
  id: string;
  name: string;
  /** Serialized from a Prisma Decimal, so it arrives as a string. */
  price: string;
  quantityAvailable: number;
  saleEndsAt: string | null;
}

export type TextAlign = 'left' | 'center' | 'right';

/** Resolution-independent placement of the attendee name on the credential. */
export interface NamePosition {
  xPct: number;
  yPct: number;
  fontPct?: number;
  color?: string;
  align?: TextAlign;
}

export type CertificateDispatchMode = 'MANUAL' | 'AUTO';

export interface EventEntity {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  status: EventStatus;
  credentialArtworkUrl: string | null;
  credentialNamePosition: NamePosition | null;
  certificateTemplateUrl: string | null;
  certificateNamePosition: NamePosition | null;
  certificateDispatchMode: CertificateDispatchMode;
  certificateAutoDelayHours: number | null;
  createdAt: string;
  eventDays: EventDay[];
  ticketTypes: TicketType[];
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  location?: string;
  coverImageUrl?: string;
  status?: EventStatus;
}

export interface UpdateCredentialInput {
  artworkUrl?: string;
  namePosition?: NamePosition;
}

export interface UpdateCertificateInput {
  templateUrl?: string;
  namePosition?: NamePosition;
  dispatchMode?: CertificateDispatchMode;
  autoDelayHours?: number;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  coverImageUrl?: string;
  days: { date: string }[];
  ticketTypes?: {
    name: string;
    price: number;
    quantityAvailable: number;
    saleEndsAt?: string;
  }[];
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

/** Public, attendee-facing shape (no tenant/credential fields). */
export interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  eventDays: EventDay[];
  ticketTypes: TicketType[];
}

export interface CreateOrderInput {
  ticketTypeId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
}

export interface CheckoutResult {
  orderId: string;
  status: string;
  paymentUrl: string;
}

export const publicApi = {
  getEvent: (id: string) => request<PublicEvent>(`/public/events/${id}`),
  createOrder: (eventId: string, input: CreateOrderInput) =>
    request<CheckoutResult>(`/public/events/${eventId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export const eventsApi = {
  list: () => request<EventEntity[]>('/events'),
  get: (id: string) => request<EventEntity>(`/events/${id}`),
  create: (input: CreateEventInput) =>
    request<EventEntity>('/events', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateEventInput) =>
    request<EventEntity>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  updateCredential: (id: string, input: UpdateCredentialInput) =>
    request<EventEntity>(`/events/${id}/credential`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  updateCertificate: (id: string, input: UpdateCertificateInput) =>
    request<EventEntity>(`/events/${id}/certificate`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export interface Participant {
  id: string;
  name: string;
  willNotAttend: boolean;
  credentialSentAt: string | null;
  certificateSentAt: string | null;
  order: { buyerEmail: string };
  /** One row per event day. */
  attendance: { eventDayId: string; status: AttendanceRowStatus; checkedInAt: string | null }[];
}

export const participantsApi = {
  list: (eventId: string) => request<Participant[]>(`/events/${eventId}/participants`),
};

export const certificatesApi = {
  sendOne: (eventId: string, participantId: string) =>
    request<{ queued: boolean }>(
      `/events/${eventId}/participants/${participantId}/certificate`,
      { method: 'POST' },
    ),
  sendAll: (eventId: string) =>
    request<{ queued: number }>(`/events/${eventId}/certificates/send-all`, {
      method: 'POST',
    }),
};

export type CheckInMethod = 'QR' | 'MANUAL';

export interface CheckInInput {
  eventDayId: string;
  method: CheckInMethod;
  qrToken?: string;
  participantId?: string;
  /** Echoed back by the API so the offline queue can reconcile the result. */
  clientId?: string;
}

export type AttendanceRowStatus = 'PENDING' | 'PRESENT' | 'ABSENT';

export interface Attendance {
  id: string;
  status: AttendanceRowStatus;
  checkedInAt: string | null;
  participant: { id: string; name: string };
}

export interface CheckInResult {
  clientId?: string;
  status: 'checked_in' | 'already_checked_in' | 'error';
  message?: string;
  attendance?: Attendance;
}

export interface DaySummary {
  eventDayId: string;
  total: number;
  present: number;
  missing: number;
}

export interface AttendanceSearchResult {
  id: string;
  name: string;
  willNotAttend: boolean;
  attendance: { id: string; status: AttendanceRowStatus; checkedInAt: string | null } | null;
}

export interface UploadResult {
  url: string;
}

/** Separate from `request()`: multipart bodies must not carry a manual
 * `Content-Type` header — the browser sets the boundary itself. */
async function uploadFile(path: string, file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Is the API running?', 0);
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }
  return (await response.json()) as UploadResult;
}

export const uploadsApi = {
  credentialArtwork: (file: File) => uploadFile('/uploads/credential-artwork', file),
  certificateTemplate: (file: File) => uploadFile('/uploads/certificate-template', file),
  tenantLogo: (file: File) => uploadFile('/uploads/tenant-logo', file),
};

export interface TeamMember extends Permissions {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface InviteTeamMemberInput {
  name: string;
  email: string;
}

export const teamApi = {
  list: () => request<TeamMember[]>('/team'),
  invite: (input: InviteTeamMemberInput) =>
    request<{ user: TeamMember; temporaryPassword: string }>('/team', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<void>(`/team/${id}`, { method: 'DELETE' }),
  updatePermissions: (id: string, input: Partial<Permissions>) =>
    request<TeamMember>(`/team/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export interface TenantProfile {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  asaasConnected: boolean;
}

export interface UpdateTenantInput {
  name?: string;
  subdomain?: string;
  logoUrl?: string;
}

export const tenantApi = {
  get: () => request<TenantProfile>('/tenant'),
  update: (input: UpdateTenantInput) =>
    request<TenantProfile>('/tenant', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  connectAsaas: (apiKey: string) =>
    request<TenantProfile>('/tenant/asaas', {
      method: 'PATCH',
      body: JSON.stringify({ apiKey }),
    }),
  disconnectAsaas: () =>
    request<TenantProfile>('/tenant/asaas', { method: 'DELETE' }),
};

export const attendanceApi = {
  checkIn: (eventId: string, input: CheckInInput) =>
    request<CheckInResult>(`/events/${eventId}/attendance/check-in`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  batchSync: (eventId: string, checkIns: CheckInInput[]) =>
    request<CheckInResult[]>(`/events/${eventId}/attendance/batch-sync`, {
      method: 'POST',
      body: JSON.stringify({ checkIns }),
    }),
  summary: (eventId: string) =>
    request<DaySummary[]>(`/events/${eventId}/attendance/summary`),
  search: (eventId: string, eventDayId: string, query: string) =>
    request<AttendanceSearchResult[]>(
      `/events/${eventId}/attendance/search?eventDayId=${encodeURIComponent(eventDayId)}&q=${encodeURIComponent(query)}`,
    ),
  setWillNotAttend: (eventId: string, participantId: string, willNotAttend: boolean) =>
    request<{ id: string }>(
      `/events/${eventId}/attendance/participants/${participantId}/will-not-attend`,
      { method: 'PATCH', body: JSON.stringify({ willNotAttend }) },
    ),
};
