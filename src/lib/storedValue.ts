'use client';

import { useCallback, useSyncExternalStore } from 'react';

/*
 * A small localStorage-backed value shared by every caller (same pattern as useExpenses):
 * read through useSyncExternalStore, cached on the raw string so the snapshot is stable,
 * written only when set() is called, and synced across tabs by the storage event.
 * Use it for small settings; expenses themselves live in useExpenses.
 */

interface StoredValueOptions<T> {
  key: string;
  fallback: T;
  /** Turn the stored string into a value; return null if it isn't valid. */
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
}

export function createStoredValue<T>({ key, fallback, parse, serialize }: StoredValueOptions<T>) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  function read(): T {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cachedValue;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = raw === null ? fallback : (parse(raw) ?? fallback);
    }
    return cachedValue;
  }

  function write(value: T) {
    const raw = serialize(value);
    try {
      localStorage.setItem(key, raw);
      cachedRaw = raw;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      cachedRaw = undefined;
    }
    cachedValue = value;
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === key) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  const getServerSnapshot = () => fallback;

  function useValue(): [T, (value: T) => void] {
    const value = useSyncExternalStore(subscribe, read, getServerSnapshot);
    const set = useCallback((next: T) => write(next), []);
    return [value, set];
  }

  return { useValue, read, write };
}
