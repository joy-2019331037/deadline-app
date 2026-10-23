/** Animations are skipped where the browser cannot report motion preferences (e.g. jsdom). */
export function canAnimate() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
