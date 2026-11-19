import { formatDistanceToNow } from 'date-fns';
import type { BankConnectionView } from '@/features/imports/lib/protocol';

/** "Synced 3 hours ago" or "Not synced yet". */
export function lastSynced(connection: BankConnectionView) {
  return connection.lastSyncedAt
    ? `Synced ${formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}`
    : 'Not synced yet';
}
