import { useEffect } from 'react';

/**
 * Set the document title for a route and restore the previous one on unmount.
 * The static title in index.html covers the landing page for crawlers; this
 * keeps the tab readable as people move between public routes.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
