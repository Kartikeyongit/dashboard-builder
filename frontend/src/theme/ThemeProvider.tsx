import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  readStoredTheme,
  systemTheme,
  THEME_STORAGE_KEY,
} from '../theme';
import type { ResolvedTheme, ThemePreference } from '../theme';
import { ThemeContext } from './context';
import type { ThemeContextValue } from './context';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredTheme());
  // The OS value is state so that "system" can react to OS changes without
  // writing state from inside an effect.
  const [system, setSystem] = useState<ResolvedTheme>(() => systemTheme());

  const resolved: ResolvedTheme = preference === 'system' ? system : preference;

  // Apply the resolved theme and remember the explicit preference.
  useEffect(() => {
    applyTheme(resolved);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage may be unavailable; the theme still applies for this session.
    }
  }, [preference, resolved]);

  // Track OS changes for the whole session; they only matter while the
  // preference is "system", where `resolved` derives from `system`.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const active = current === 'system' ? systemTheme() : current;
      return active === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
