let saved: string | null = null;
let manual = false;
try { saved = localStorage.getItem('theme'); manual = localStorage.getItem('theme_manual') === '1'; } catch {}
if (saved && manual) {
  document.documentElement.setAttribute('data-theme', saved);
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

export function setTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(): string {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  return next;
}
