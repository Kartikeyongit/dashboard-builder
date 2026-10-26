export const DEFAULT_API_BASE = 'http://localhost:8080/api/v1';

/**
 * Accepts either a full API base ("https://api.example.com/api/v1") or just an
 * origin ("https://api.example.com") and returns a URL ending in /api/v1.
 * This makes Render's RENDER_EXTERNAL_URL usable without extra configuration.
 */
export function normalizeApiBase(raw: string | undefined | null): string {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  if (!value) return DEFAULT_API_BASE;
  return /\/api\/v1$/i.test(value) ? value : `${value}/api/v1`;
}

/** Derives the WebSocket origin from an API base. */
export function apiBaseToWsBase(apiBase: string): string {
  return apiBase.replace(/^http/i, 'ws').replace(/\/api\/v1$/i, '');
}
