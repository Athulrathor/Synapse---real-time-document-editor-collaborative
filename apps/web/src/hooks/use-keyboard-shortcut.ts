"use client";

import { useEffect, useEffectEvent } from "react";

type ShortcutOptions = {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
};

export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): void {
  const {
    ctrl = false,
    meta = false,
    shift = false,
    alt = false,
    enabled = true,
    preventDefault = true,
  } = options;

  const onShortcut = useEffectEvent(callback);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const matches =
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.metaKey === meta &&
        event.shiftKey === shift &&
        event.altKey === alt;

      if (!matches) return;

      if (preventDefault) {
        event.preventDefault();
      }

      onShortcut(event);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, ctrl, meta, shift, alt, enabled, preventDefault]);
}
