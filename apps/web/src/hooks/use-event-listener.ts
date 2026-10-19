"use client";

import { useEffect, useEffectEvent } from "react";

type EventTargetWithListeners = Window | Document | HTMLElement;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  target?: Window,
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  target: Document,
): void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  target: HTMLElement,
): void;

export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  target: EventTargetWithListeners = window,
): void {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: Event) => onEvent(event);

    target.addEventListener(eventName, listener);

    return () => {
      target.removeEventListener(eventName, listener);
    };
  }, [eventName, target]);
}
