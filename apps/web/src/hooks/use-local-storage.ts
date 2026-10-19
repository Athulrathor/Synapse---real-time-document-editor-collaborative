"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      try {
        const storedValue = window.localStorage.getItem(key);

        if (isActive && storedValue !== null) {
          setValue(JSON.parse(storedValue) as T);
        }
      } catch {
        // Keep the initial value if storage is unavailable or invalid.
      } finally {
        if (isActive) setIsLoaded(true);
      }
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [key]);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable or full.
    }
  }, [key, value, isLoaded]);

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable.
    }

    setValue(initialValue);
  };

  return {
    value,
    setValue,
    removeValue,
    isLoaded,
  };
}
