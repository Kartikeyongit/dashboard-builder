/**
 * Theme bootstrap.
 *
 * This module runs before React mounts so the correct `data-theme` is present
 * on the first paint (no light-mode flash for dark-mode users). The provider in
 * `theme/ThemeProvider.tsx` owns all later changes.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'dashboard-builder-theme';

export function readStoredTheme(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing or a blocked storage API: fall back to the system theme.
  }
  return 'system';
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

applyTheme(resolveTheme(readStoredTheme()));
