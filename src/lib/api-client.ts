/**
 * API Proxy Client — ElysiaJS Backend
 *
 * Semua request dari Svelte frontend akan di-proxy ke backend ElysiaJS
 * melalui Astro API routes. Backend URL bisa dikonfigurasi via environment variable.
 */

const BACKEND_URL = import.meta.env.BACKEND_URL ?? 'http://localhost:3000';

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    // Propagate error from backend: { success: false, message: "..." }
    return json as T;
  }

  return json as T;
}

// ── Auth ─────────────────────────────────────────────────
export async function login(email: string, password: string) {
  return request<{ success: boolean; token?: string; user?: Record<string, unknown>; message?: string }>(
    '/api/v1/auth/login',
    { method: 'POST', body: { email, password } },
  );
}

export async function getMe(token: string) {
  return request<{ success: boolean; user?: Record<string, unknown>; message?: string }>(
    '/api/v1/auth/me',
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

// ── Categories ───────────────────────────────────────────
export async function getCategories() {
  return request<{ success: boolean; data?: Array<{ id: number; icon: string; title: string; description: string }> }>(
    '/api/v1/categories/',
  );
}

export async function getCategory(id: number) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/categories/${id}`,
  );
}

export async function createCategory(data: { icon: string; title: string; description: string }) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    '/api/v1/categories/',
    { method: 'POST', body: data },
  );
}

export async function updateCategory(id: number, data: { icon?: string; title?: string; description?: string }) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/categories/${id}`,
    { method: 'PUT', body: data },
  );
}

export async function deleteCategory(id: number) {
  return request<{ success: boolean; message?: string }>(
    `/api/v1/categories/${id}`,
    { method: 'DELETE' },
  );
}

// ── Layanan ──────────────────────────────────────────────
export async function getLayanan(categoryId?: number) {
  const qs = categoryId ? `?categoryId=${categoryId}` : '';
  return request<{ success: boolean; data?: Array<Record<string, unknown>> }>(
    `/api/v1/layanan/${qs}`,
  );
}

export async function getLayananById(id: number) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/layanan/${id}`,
  );
}

export async function createLayanan(data: Record<string, unknown>) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    '/api/v1/layanan/',
    { method: 'POST', body: data },
  );
}

export async function updateLayanan(id: number, data: Record<string, unknown>) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/layanan/${id}`,
    { method: 'PUT', body: data },
  );
}

export async function deleteLayanan(id: number) {
  return request<{ success: boolean; message?: string }>(
    `/api/v1/layanan/${id}`,
    { method: 'DELETE' },
  );
}

// ── Persyaratan ──────────────────────────────────────────
export async function getPersyaratan(layananId?: number) {
  const qs = layananId ? `?layananId=${layananId}` : '';
  return request<{ success: boolean; data?: Array<{ id: number; layananId: number; label: string; required: boolean }> }>(
    `/api/v1/persyaratan/${qs}`,
  );
}

// ── Permohonan ───────────────────────────────────────────
export async function getPermohonan(params?: { status?: string; q?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const qStr = qs.toString();
  return request<{ success: boolean; data?: Array<Record<string, unknown>>; pagination?: Record<string, number>; stats?: Record<string, number> }>(
    `/api/v1/permohonan/${qStr ? `?${qStr}` : ''}`,
  );
}

export async function getPermohonanById(id: string) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/permohonan/${id}`,
  );
}

export async function createPermohonan(data: Record<string, unknown>) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    '/api/v1/permohonan/',
    { method: 'POST', body: data },
  );
}

export async function deletePermohonan(id: string) {
  return request<{ success: boolean; message?: string }>(
    `/api/v1/permohonan/${id}`,
    { method: 'DELETE' },
  );
}

export async function updatePermohonanStatus(id: string, data: { status: string; rejectionReason?: string; outputFile?: { nama: string; url: string } }) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/permohonan/${id}/status`,
    { method: 'PUT', body: data },
  );
}

export async function trackPermohonan(id: string) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/permohonan/track/${id}`,
  );
}

// ── Dashboard ────────────────────────────────────────────
export async function getDashboardStats() {
  return request<{ success: boolean; data?: { total: number; diterima: number; diproses: number; selesai: number; ditolak: number } }>(
    '/api/v1/dashboard/stats',
  );
}

export async function getDashboardTrend(period: string) {
  return request<{ success: boolean; data?: { labels: string[]; total: number[]; selesai: number[]; proses: number[] } }>(
    `/api/v1/dashboard/trend?period=${period}`,
  );
}

export async function getKategoriPopuler() {
  return request<{ success: boolean; data?: Array<{ label: string; count: number }> }>(
    '/api/v1/dashboard/kategori-populer',
  );
}

export async function getPermohonanTerbaru(limit: number = 5) {
  return request<{ success: boolean; data?: Array<Record<string, unknown>> }>(
    `/api/v1/dashboard/permohonan-terbaru?limit=${limit}`,
  );
}

// ── Internal Services ────────────────────────────────────
export async function getInternalServices() {
  return request<{ success: boolean; data?: Array<Record<string, unknown>> }>(
    '/api/v1/internal/services',
  );
}

export async function getInternalServiceById(id: string) {
  return request<{ success: boolean; data?: Record<string, unknown>; message?: string }>(
    `/api/v1/internal/services/${id}`,
  );
}

// ── External Services ────────────────────────────────────
export async function getExternalServices() {
  return request<{ success: boolean; data?: Array<{ id: number; icon: string; title: string; appsName: string; description: string; link: string }> }>(
    '/api/v1/external-services',
  );
}
