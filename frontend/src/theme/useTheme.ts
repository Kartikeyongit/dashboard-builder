import { useContext } from 'react';
import { readStoredTheme, resolveTheme } from '../theme';
import { ThemeContext } from './context';
import type { ThemeContextValue } from './context';

/**
 * Read the active theme. Returns a safe default outside the provider so a
 * component can be rendered in isolation (for example in a unit test).
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;
  return {
    preference: 'system',
    resolved: resolveTheme(readStoredTheme()),
    setPreference: () => undefined,
    toggle: () => undefined,
  };
}
