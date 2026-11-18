'use client';

import { useCallback } from 'react';
import { addDays } from 'date-fns';
import { createStoredValue } from '@/lib/storedValue';

/** When the user last made a full backup, and until when the reminder is snoozed. */
export interface BackupStatus {
  lastBackupAt: string | null;
  snoozedUntil: string | null;
}

const EMPTY: BackupStatus = { lastBackupAt: null, snoozedUntil: null };

const statusStore = createStoredValue<BackupStatus>({
  key: 'expense-tracker-backup-status',
  fallback: EMPTY,
  parse: (raw) => {
    try {
      const value = JSON.parse(raw) as Partial<BackupStatus>;
      return {
        lastBackupAt: typeof value.lastBackupAt === 'string' ? value.lastBackupAt : null,
        snoozedUntil: typeof value.snoozedUntil === 'string' ? value.snoozedUntil : null,
      };
    } catch {
      return null;
    }
  },
  serialize: (value) => JSON.stringify(value),
});

export function useBackupStatus() {
  const [status, save] = statusStore.useValue();
  const markBackedUp = useCallback(() => save({ lastBackupAt: new Date().toISOString(), snoozedUntil: null }), [save]);
  const snooze = useCallback(
    (days = 7) => save({ ...statusStore.read(), snoozedUntil: addDays(new Date(), days).toISOString() }),
    [save]
  );
  return { status, markBackedUp, snooze };
}
