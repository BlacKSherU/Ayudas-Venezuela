import type { Bbox, Category, Need, NeedStatus, Urgency } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:8787/api/v1";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = body?.error?.code ?? "ERROR";
    const message = body?.error?.message ?? "Ocurrió un error";
    throw new ApiError(code, message, res.status);
  }
  return body as T;
}

export interface NewNeedInput {
  urgency: Urgency;
  location: { lat: number; lng: number };
  items: { categoryCode: string; quantity: string | null }[];
  note: string | null;
  contactPublic: string | null;
  contactPublicConsent: boolean;
}

export interface NeedsQuery {
  bbox: Bbox;
  status?: NeedStatus;
  category?: string;
  urgency?: Urgency;
  limit?: number;
}

export const api = {
  // Identidad ligera
  requestCode: (channel: "email" | "phone", contact: string) =>
    request<{ requestId: string; expiresInSec: number; devCode?: string }>(
      "/identity/request-code",
      { method: "POST", body: JSON.stringify({ channel, contact }) },
    ),
  verifyCode: (requestId: string, code: string) =>
    request<{ identityId: string }>("/identity/verify", {
      method: "POST",
      body: JSON.stringify({ requestId, code }),
    }),
  logout: () => request<void>("/identity/logout", { method: "POST" }),
  me: () => request<{ identityId: string | null }>("/identity/me"),

  // Catálogo
  categories: () => request<{ categories: Category[] }>("/categories"),

  // Necesidades
  listNeeds: (q: NeedsQuery) => {
    const { bbox } = q;
    const params = new URLSearchParams({
      bbox: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    });
    if (q.status) params.set("status", q.status);
    if (q.category) params.set("category", q.category);
    if (q.urgency) params.set("urgency", q.urgency);
    if (q.limit) params.set("limit", String(q.limit));
    return request<{ needs: Need[]; count: number }>(`/needs?${params.toString()}`);
  },
  getNeed: (id: string) => request<Need>(`/needs/${id}`),
  createNeed: (input: NewNeedInput) =>
    request<Need>("/needs", { method: "POST", body: JSON.stringify(input) }),
  updateNeed: (id: string, input: Partial<NewNeedInput>) =>
    request<Need>(`/needs/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteNeed: (id: string) => request<void>(`/needs/${id}`, { method: "DELETE" }),
  myNeeds: () => request<{ needs: Need[] }>("/needs/mine"),
  stats: () => request<{ delivered: number }>("/needs/stats"),
};

export { API_BASE };
