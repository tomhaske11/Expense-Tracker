import 'server-only';
import type { BankProvider } from '@/features/imports/server/bank/provider';
import { MockBankProvider } from '@/features/imports/server/bank/mockProvider';

/**
 * The configured bank provider (BANK_PROVIDER, default "mock"). Add a real aggregator by
 * implementing BankProvider and registering it here; routes and the browser don't change.
 */
export function getBankProvider(): BankProvider {
  const id = process.env.BANK_PROVIDER ?? 'mock';
  switch (id) {
    case 'mock':
      return new MockBankProvider();
    default:
      throw new Error(`Unknown BANK_PROVIDER "${id}".`);
  }
}
