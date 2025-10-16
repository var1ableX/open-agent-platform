import { useEffect, useState } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized
 * Uses 640px (Tailwind's 'sm' breakpoint) as the threshold
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Check on mount
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
