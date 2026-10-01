/**
 * Long enough that a move reads as the text gliding on rather than jumping,
 * short enough to land before the room is far into the line.
 */
export const RECITATION_SCROLL_MS = 1200;

/** Slow out of rest, slow into it: the text drifts rather than snaps. */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scrolls an element to `top` over `durationMs`, eased at both ends - the
 * browser's own smooth scroll is quick and cannot be slowed. Returns a cancel,
 * for a new move that arrives mid-glide or a reader who takes the text over:
 * the next glide then starts from wherever this one had got to.
 *
 * A reader who asks for less motion is taken straight there.
 */
export const smoothScrollTo = (
  element: HTMLElement,
  top: number,
  durationMs: number = RECITATION_SCROLL_MS,
): (() => void) => {
  const target = Math.max(0, top);
  if (
    prefersReducedMotion() ||
    durationMs <= 0 ||
    typeof window.requestAnimationFrame !== "function"
  ) {
    element.scrollTop = target;
    return () => {};
  }

  const from = element.scrollTop;
  const distance = target - from;
  if (Math.abs(distance) < 1) return () => {};

  let frame = 0;
  let startedAt: number | null = null;
  const step = (now: number) => {
    startedAt ??= now;
    const progress = Math.min(1, (now - startedAt) / durationMs);
    element.scrollTop = from + distance * easeInOutCubic(progress);
    if (progress < 1) frame = window.requestAnimationFrame(step);
  };
  frame = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frame);
};
