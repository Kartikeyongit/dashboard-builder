import { createContext } from 'react';
import type { ResolvedTheme, ThemePreference } from '../theme';

export interface ThemeContextValue {
  /** What the user picked: light, dark, or follow the OS. */
  preference: ThemePreference;
  /** What is actually rendered right now. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark, keeping an explicit choice. */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
