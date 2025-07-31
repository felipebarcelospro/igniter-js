import { useEffect, useState } from "react";

/**
 * A custom hook that returns a boolean indicating whether the given media query matches.
 *
 * @param {string} query - The media query string to evaluate.
 * @returns {boolean} True if the media query matches, false otherwise.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}
