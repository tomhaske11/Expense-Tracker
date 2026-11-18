import 'server-only';
import type { SourceAccount, SourceTransaction } from '@/features/imports/types';
import type { BankInstitution } from '@/features/imports/lib/protocol';

/*
 * The contract every bank aggregator implements. It follows the standard flow:
 *   1. createLinkToken()      server starts a "connect your bank" session for a user
 *   2. (browser)              the provider's widget runs and returns a one-time public token
 *   3. exchangePublicToken()  server swaps it for a long-lived access token (stored server-side only)
 *   4. sync(cursor)           incremental: everything added or removed since the cursor
 * Today only MockBankProvider exists; a Plaid/Teller/SimpleFIN provider implements the same interface.
 */

export interface LinkSession {
  linkToken: string;
  /** Institutions the browser can show; real providers render their own picker instead. */
  institutions: BankInstitution[];
}

export interface ExchangeResult {
  accessToken: string;
  institution: BankInstitution;
  accounts: SourceAccount[];
}

export interface SyncPage {
  added: SourceTransaction[];
  /** External ids no longer valid (e.g. a pending charge replaced by its posted version). */
  removed: string[];
  nextCursor: string;
  hasMore: boolean;
}

export interface BankProvider {
  readonly id: string;
  /** False for sandbox/mock providers, whose tokens don't grant access to real money. */
  readonly live: boolean;
  createLinkToken(userId: string): Promise<LinkSession>;
  exchangePublicToken(publicToken: string): Promise<ExchangeResult>;
  sync(accessToken: string, cursor: string | null): Promise<SyncPage>;
  /** Revoke the access token at the provider when a connection is removed. */
  removeItem(accessToken: string): Promise<void>;
}
