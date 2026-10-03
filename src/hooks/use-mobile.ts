import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const isMobileWidth = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

/**
 * Whether the viewport is phone-sized.
 *
 * Read on the first render rather than after it: a caller that mounts
 * something only on a wide screen - the live page's autoplaying stream - would
 * otherwise mount it for one frame on every phone, and start loading it.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(isMobileWidth);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(isMobileWidth());
    };
    mql.addEventListener("change", onChange);
    setIsMobile(isMobileWidth());
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
