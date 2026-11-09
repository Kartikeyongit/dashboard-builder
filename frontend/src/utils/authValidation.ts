/**
 * Client-side auth rules.
 *
 * Keep these in step with the API: registration accepts passwords of at least
 * six characters, and accepting a team invite requires eight. The extra
 * checks in the strength meter are guidance only, never requirements.
 */
export const MIN_REGISTER_PASSWORD = 6;
export const MIN_INVITE_PASSWORD = 8;

export type PasswordTone = 'danger' | 'warning' | 'primary' | 'success';

export interface PasswordStrength {
  /** 0–100, used as the meter width. */
  score: number;
  label: '' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  tone: PasswordTone | null;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', tone: null };

  let score = 0;
  if (password.length >= MIN_REGISTER_PASSWORD) score += 20;
  if (password.length >= 10) score += 15;
  if (password.length >= 14) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  score = Math.min(100, score);

  if (score < 35) return { score, label: 'Weak', tone: 'danger' };
  if (score < 60) return { score, label: 'Fair', tone: 'warning' };
  if (score < 80) return { score, label: 'Good', tone: 'primary' };
  return { score, label: 'Strong', tone: 'success' };
}

export function meetsMinimumLength(password: string, minimum: number): boolean {
  return password.length >= minimum;
}

/**
 * Deliberately permissive: the server is the authority. This only catches
 * obvious typos before a round trip.
 */
export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (value.length === 0 || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Trim and lowercase an address before it goes to the API. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
