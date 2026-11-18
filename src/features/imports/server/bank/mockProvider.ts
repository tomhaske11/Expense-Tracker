import 'server-only';
import { addDays, format, getDate, getDay, parseISO, subDays } from 'date-fns';
import type { SourceAccount, SourceTransaction } from '@/features/imports/types';
import type { BankInstitution } from '@/features/imports/lib/protocol';
import type { BankProvider, ExchangeResult, LinkSession, SyncPage } from '@/features/imports/server/bank/provider';

/*
 * A sandbox bank for building and testing the import flow without a real connection.
 * Deterministic: the same access token always yields the same history, so re-syncs are
 * stable. Transactions look like real bank data: processor prefixes and store numbers,
 * pending charges that post two days later under a new id, refunds, paychecks, card
 * payments (transfers) and a foreign-currency charge. History starts 60 days back.
 */

const INSTITUTIONS: BankInstitution[] = [
  { id: 'ins_demo_bank', name: 'Demo Bank' },
  { id: 'ins_sample_cu', name: 'Sample Credit Union' },
];

const HISTORY_DAYS = 60;
/** Charges from the last this-many days are still pending. */
const PENDING_DAYS = 2;

interface Cursor {
  v: 1;
  /** Posted transactions up to and including this date have been delivered. */
  through: string;
  pending: string[];
}

const encode = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
function decode(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Cursor;
    return c.v === 1 && /^\d{4}-\d{2}-\d{2}$/.test(c.through) && Array.isArray(c.pending) ? c : null;
  } catch {
    return null;
  }
}

/** Small seeded PRNG (mulberry32) so every token produces a stable history. */
function rng(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function institutionFromToken(token: string): BankInstitution {
  return INSTITUTIONS.find((i) => token.includes(i.id)) ?? INSTITUTIONS[0];
}

function accountsFor(institution: BankInstitution): SourceAccount[] {
  return [
    { id: `${institution.id}_chk`, name: `${institution.name} Checking`, mask: '1234', type: 'checking' },
    { id: `${institution.id}_cc`, name: `${institution.name} Rewards Card`, mask: '9876', type: 'credit' },
  ];
}

type Draft = Omit<SourceTransaction, 'externalId' | 'accountId' | 'date' | 'pending'> & { account: 'chk' | 'cc' };

/** The transactions that happened on one day, before ids and pending state are assigned. */
function dayTransactions(token: string, day: Date): Draft[] {
  const r = rng(`${token}|${format(day, 'yyyy-MM-dd')}`);
  const money = (min: number, max: number) => Math.round((min + r() * (max - min)) * 100) / 100;
  const dom = getDate(day);
  const dow = getDay(day);
  // Absolute day number, so a given date always has the same transactions whenever it's synced.
  const epochDay = Math.round(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000);
  const out: Draft[] = [];
  const add = (d: Omit<Draft, 'currency'> & { currency?: string }) => out.push({ currency: 'USD', ...d });

  // Checking
  if (dom === 1) add({ account: 'chk', description: 'AVALON PROPERTIES RENT ACH', amount: 1850, categoryHint: 'RENT_AND_UTILITIES' });
  if (dom === 10) add({ account: 'chk', description: 'PG&E WEBRECURRING BILL', merchantName: 'PG&E', amount: money(88, 142), categoryHint: 'RENT_AND_UTILITIES' });
  if (dom === 15 || dom === 28) add({ account: 'chk', description: 'PAYROLL DEPOSIT ACME CORP', amount: -3200, categoryHint: 'INCOME' });
  if (dom === 20) add({ account: 'chk', description: 'ONLINE PAYMENT TO CREDIT CARD AUTOPAY', amount: money(600, 1100), categoryHint: 'TRANSFER_OUT' });

  // Credit card
  if (dom === 21) add({ account: 'cc', description: 'PAYMENT THANK YOU - WEB', amount: -money(600, 1100), categoryHint: 'TRANSFER_IN' });
  if (dow >= 1 && dow <= 5 && r() < 0.6) add({ account: 'cc', description: 'SQ *BLUE BOTTLE COFFEE OAKLAND CA', amount: 5.25, categoryHint: 'FOOD_AND_DRINK' });
  if (dow === 0) add({ account: 'cc', description: 'WHOLEFDS MKT #10234 OAKLAND CA', merchantName: 'Whole Foods Market', amount: money(45, 120), categoryHint: 'FOOD_AND_DRINK' });
  if ((dow === 2 || dow === 5) && r() < 0.5) add({ account: 'cc', description: 'UBER *TRIP HELP.UBER.COM CA', merchantName: 'Uber', amount: money(11, 28), categoryHint: 'TRANSPORTATION' });
  if (epochDay % 9 === 4) add({ account: 'cc', description: 'CHEVRON 0091234 OAKLAND CA', amount: money(45, 62), categoryHint: 'TRANSPORTATION' });
  if (dom === 15) add({ account: 'cc', description: 'NETFLIX.COM LOS GATOS CA', merchantName: 'Netflix', amount: 15.99, categoryHint: 'ENTERTAINMENT' });
  if (dom === 3) add({ account: 'cc', description: 'SPOTIFY USA 877-778-1161', amount: 11.99, categoryHint: 'ENTERTAINMENT' });
  if ((dow === 5 || dow === 6) && r() < 0.6) {
    const places = ['TST* NOPALITO OAKLAND', 'SQ *TARTINE BAKERY SAN FRANCISCO', 'CHIPOTLE 2291 OAKLAND', 'SWEETGREEN OAKLAND 0187'];
    add({ account: 'cc', description: places[Math.floor(r() * places.length)], amount: money(14, 80), categoryHint: 'FOOD_AND_DRINK' });
  }
  if (r() < 0.15) add({ account: 'cc', description: `AMZN Mktp US*${Math.floor(r() * 36 ** 5).toString(36).toUpperCase()}`, amount: money(9, 90), categoryHint: 'GENERAL_MERCHANDISE' });
  if (epochDay % 41 === 7) add({ account: 'cc', description: 'AMAZON.COM REFUND', amount: -24.99, categoryHint: 'GENERAL_MERCHANDISE' });
  if (epochDay % 53 === 11) add({ account: 'cc', description: 'CAFE DE FLORE PARIS FR', amount: 18.4, currency: 'EUR', categoryHint: 'FOOD_AND_DRINK' });
  // Every day has at least one charge, so recent days always show something pending.
  if (out.length === 0) add({ account: 'cc', description: 'CLIPPER TRANSIT FARE SAN FRANCISCO', amount: money(2.5, 6), categoryHint: 'TRANSPORTATION' });
  return out;
}

export class MockBankProvider implements BankProvider {
  readonly id = 'mock';
  readonly live = false;

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async createLinkToken(userId: string): Promise<LinkSession> {
    return { linkToken: `link-mock-${userId}-${Date.now().toString(36)}`, institutions: INSTITUTIONS };
  }

  async exchangePublicToken(publicToken: string): Promise<ExchangeResult> {
    const institution = INSTITUTIONS.find((i) => publicToken === `public-mock-${i.id}`);
    if (!institution) throw new Error('Unknown public token');
    return {
      accessToken: `access-mock-${institution.id}-${crypto.randomUUID()}`,
      institution,
      accounts: accountsFor(institution),
    };
  }

  async sync(accessToken: string, rawCursor: string | null): Promise<SyncPage> {
    const institution = institutionFromToken(accessToken);
    const [chk, cc] = accountsFor(institution);
    const today = this.clock();
    const historyStart = subDays(today, HISTORY_DAYS - 1);
    const postedThrough = subDays(today, PENDING_DAYS);
    const cursor = decode(rawCursor);
    const from = cursor ? addDays(parseISO(cursor.through), 1) : historyStart;

    const added: SourceTransaction[] = [];
    const pendingIds: string[] = [];
    for (let day = from < historyStart ? historyStart : from; day <= today; day = addDays(day, 1)) {
      const date = format(day, 'yyyy-MM-dd');
      const pending = day > postedThrough;
      dayTransactions(accessToken, day).forEach((d, i) => {
        const { account, ...rest } = d;
        const id = `${institution.id}_${date.replaceAll('-', '')}_${i}`;
        const externalId = pending ? `pend_${id}` : id;
        if (pending) pendingIds.push(externalId);
        added.push({ ...rest, externalId, accountId: account === 'chk' ? chk.id : cc.id, date, pending });
      });
    }

    // Pending charges from the last sync that have since posted come back under their posted id.
    const removed = (cursor?.pending ?? []).filter((id) => !pendingIds.includes(id));
    // Those posted versions predate `from` when the previous sync was recent, so add them explicitly.
    for (const pendingId of removed) {
      const id = pendingId.replace(/^pend_/, '');
      if (added.some((t) => t.externalId === id)) continue;
      const [, , ymd, index] = id.match(/^(.*)_(\d{8})_(\d+)$/) ?? [];
      if (!ymd) continue;
      const day = parseISO(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`);
      const d = dayTransactions(accessToken, day)[Number(index)];
      if (!d) continue;
      const { account, ...rest } = d;
      added.push({ ...rest, externalId: id, accountId: account === 'chk' ? chk.id : cc.id, date: format(day, 'yyyy-MM-dd'), pending: false });
    }

    return {
      added,
      removed,
      nextCursor: encode({ v: 1, through: format(postedThrough, 'yyyy-MM-dd'), pending: pendingIds }),
      hasMore: false,
    };
  }

  async removeItem(): Promise<void> {
    // Nothing to revoke for sandbox tokens.
  }
}
