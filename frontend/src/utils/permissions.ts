import type { User } from '../types';

const EDITOR_ROLES = ['admin', 'editor'];

/**
 * Viewers can read dashboards but must not see or use editing controls.
 * This mirrors the backend RequireRole("admin", "editor") middleware; the
 * backend remains the source of truth.
 */
export function canEditContent(user: User | null | undefined): boolean {
  if (!user) return false;
  return EDITOR_ROLES.includes(user.role);
}
