'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BankConnectionView, BankInstitution } from '@/features/imports/lib/protocol';

/** The user's bank connections (fetched from the server, which holds the tokens). */
export function useBankConnections() {
  const [connections, setConnections] = useState<BankConnectionView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch('/api/bank/connections')
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json() as Promise<{ connections: BankConnectionView[] }>;
        })
        .then(
          (data) => {
            setConnections(data.connections);
            setError(null);
          },
          () => {
            setError("Couldn't load bank connections.");
            setConnections((c) => c ?? []);
          }
        ),
    []
  );

  useEffect(() => {
    // State is only set once the request resolves.
    let cancelled = false;
    fetch('/api/bank/connections')
      .then((res) => (res.ok ? (res.json() as Promise<{ connections: BankConnectionView[] }>) : Promise.reject()))
      .then(
        (data) => !cancelled && setConnections(data.connections),
        () => {
          if (cancelled) return;
          setError("Couldn't load bank connections.");
          setConnections([]);
        }
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = load;

  /** Start a link session: returns the institutions to choose from and whether it's a sandbox. */
  const startLink = useCallback(async (): Promise<{ institutions: BankInstitution[]; sandbox: boolean }> => {
    const res = await fetch('/api/bank/link', { method: 'POST' });
    if (!res.ok) throw new Error("Couldn't start connecting a bank.");
    return (await res.json()) as { institutions: BankInstitution[]; sandbox: boolean };
  }, []);

  /** Finish linking with the provider's public token; returns the new connection. */
  const finishLink = useCallback(async (publicToken: string): Promise<BankConnectionView> => {
    const res = await fetch('/api/bank/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicToken }),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? "Couldn't connect the bank.");
    const connection = data as BankConnectionView;
    setConnections((c) => [...(c ?? []), connection]);
    return connection;
  }, []);

  const disconnect = useCallback(async (id: string) => {
    const res = await fetch(`/api/bank/connections?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Couldn't disconnect.");
    setConnections((c) => (c ?? []).filter((x) => x.id !== id));
  }, []);

  /** Replace one connection after an acknowledged sync (new lastSyncedAt). */
  const replace = useCallback((connection: BankConnectionView) => {
    setConnections((c) => (c ?? []).map((x) => (x.id === connection.id ? connection : x)));
  }, []);

  return { connections, error, refresh, startLink, finishLink, disconnect, replace };
}
