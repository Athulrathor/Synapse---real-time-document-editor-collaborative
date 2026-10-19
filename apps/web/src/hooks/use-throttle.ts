"use client";

import { useEffect, useState } from "react";

export function useThrottle<T>(value: T, delay = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setThrottledValue(value);
    }, Math.max(0, delay));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return throttledValue;
}