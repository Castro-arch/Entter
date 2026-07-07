'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import type { EventEntity } from './api';

const STORAGE_KEY = 'entter:lastEventId';

/**
 * Resolves which event the sidebar's event-scoped links (Check-in,
 * Credencial, Certificados) should point to: the route param when already on
 * an event-scoped page, else the last event the user switched to (read
 * straight from localStorage — cheap enough not to need its own state, and
 * it's always in sync with what was actually persisted), else the most
 * recent event. Shared by the sidebar and the event switcher so both agree
 * on "current event" without lifting state into a context.
 */
export function useCurrentEventId(events: EventEntity[] | null): string | null {
  const params = useParams<{ id?: string }>();

  useEffect(() => {
    if (params?.id) localStorage.setItem(STORAGE_KEY, params.id);
  }, [params?.id]);

  if (params?.id) return params.id;

  const lastSelected = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  if (lastSelected && events?.some((event) => event.id === lastSelected)) {
    return lastSelected;
  }
  return events?.[0]?.id ?? null;
}
