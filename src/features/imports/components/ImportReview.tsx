'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ChevronIcon, SparkleIcon } from '@/lib/icons';
import type { ImportSession } from '@/features/imports/hooks/useImportReview';
import type { ReviewItem, ReviewStatus } from '@/features/imports/types';

interface ImportReviewProps {
  session: ImportSession;
  onUpdate: (key: string, patch: Partial<Pick<ReviewItem, 'include' | 'category' | 'description'>>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const SKIPPED_LABELS: Record<Exclude<ReviewStatus, 'new' | 'possible-duplicate'>, string> = {
  'already-imported': 'Already imported',
  pending: 'Pending',
  'money-in': 'Money in',
  transfer: 'Transfers & card payments',
  'other-currency': 'Other currencies',
};
/** Statuses the user may still choose to import. */
const OPT_IN: ReviewStatus[] = ['new', 'possible-duplicate', 'transfer', 'other-currency'];

function Row({ item, onUpdate }: { item: ReviewItem; onUpdate: ImportReviewProps['onUpdate'] }) {
  const canInclude = OPT_IN.includes(item.status);
  return (
    <li className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_6rem_1fr_10rem_6rem] items-center gap-x-3 gap-y-1 py-2.5 ${item.include ? '' : 'opacity-60'}`}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-teal-400"
        checked={item.include}
        disabled={!canInclude}
        onChange={(e) => onUpdate(item.key, { include: e.target.checked })}
        aria-label={`Import ${item.description}`}
      />
      <span className="hidden sm:block text-xs text-ink-muted">{formatDate(item.date)}</span>
      <div className="min-w-0">
        <input
          value={item.description}
          onChange={(e) => onUpdate(item.key, { description: e.target.value })}
          disabled={!canInclude}
          className="w-full bg-transparent text-sm text-ink border-b border-transparent hover:border-line focus:border-accent focus:outline-none truncate"
          aria-label="Description"
        />
        <p className="text-xs text-ink-faint truncate" title={item.transaction.description}>
          <span className="sm:hidden">{formatDate(item.date)} · </span>
          {item.transaction.description}
          {item.suggestedBy === 'history' && ' · matched your history'}
          {item.suggestedBy === 'claude' && ' · named by Claude'}
        </p>
        {item.note && item.status !== 'new' && <p className="text-xs text-amber-300">{item.note}</p>}
      </div>
      <span className="sm:order-last text-right text-sm font-medium text-ink tabular-nums">{formatCurrency(item.amount)}</span>
      <div className="col-span-3 sm:col-span-1 flex items-center gap-2">
        <CategoryIcon category={item.category} className="w-4 h-4 shrink-0" />
        <select
          value={item.category}
          disabled={!canInclude}
          onChange={(e) => onUpdate(item.key, { category: e.target.value as ExpenseCategory })}
          className="w-full bg-panel-raised border border-line rounded-md px-2 py-1 text-sm text-ink-soft focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Category"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

/** Review a batch before saving: edit names and categories, opt items in or out. */
export default function ImportReview({ session, onUpdate, onConfirm, onCancel }: ImportReviewProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { items, origin } = session;
  const fresh = items.filter((i) => i.status === 'new');
  const duplicates = items.filter((i) => i.status === 'possible-duplicate');
  const skipped = (Object.keys(SKIPPED_LABELS) as (keyof typeof SKIPPED_LABELS)[])
    .map((status) => ({ status, items: items.filter((i) => i.status === status) }))
    .filter((g) => g.items.length > 0);
  const included = items.filter((i) => i.include);
  const total = included.reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className="bg-panel border border-line rounded-lg">
      <div className="p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">Review import</h2>
          <p className="text-sm text-ink-muted">
            {origin?.label} · {fresh.length} new
            {duplicates.length > 0 && ` · ${duplicates.length} possible duplicate${duplicates.length === 1 ? '' : 's'}`}
            {skipped.length > 0 && ` · ${skipped.reduce((n, g) => n + g.items.length, 0)} not imported`}
            {session.unreadable > 0 && ` · ${session.unreadable} unreadable row${session.unreadable === 1 ? '' : 's'}`}
          </p>
        </div>
        {session.suggesting && (
          <p className="text-sm text-accent flex items-center gap-2" aria-live="polite">
            <SparkleIcon className="w-4 h-4 animate-pulse" />
            Claude is naming new vendors…
          </p>
        )}
      </div>

      {session.message && <p className="px-6 pt-4 text-sm text-amber-300">{session.message}</p>}

      <div className="px-6 py-2 divide-y divide-line">
        {fresh.length > 0 ? (
          <ul className="divide-y divide-line">
            {fresh.map((item) => (
              <Row key={item.key} item={item} onUpdate={onUpdate} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm text-ink-muted text-center">Nothing new to import. You&apos;re up to date.</p>
        )}

        {duplicates.length > 0 && (
          <div className="py-3">
            <p className="text-xs font-medium uppercase tracking-widest text-amber-300 mb-1">Possible duplicates · left out unless you tick them</p>
            <ul className="divide-y divide-line">
              {duplicates.map((item) => (
                <Row key={item.key} item={item} onUpdate={onUpdate} />
              ))}
            </ul>
          </div>
        )}

        {skipped.map((group) => (
          <div key={group.status} className="py-3">
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [group.status]: !o[group.status] }))}
              className="w-full flex items-center justify-between text-xs font-medium uppercase tracking-widest text-ink-muted hover:text-ink"
            >
              <span>
                {SKIPPED_LABELS[group.status]} · {group.items.length}
              </span>
              <ChevronIcon className={`w-4 h-4 transition-transform ${open[group.status] ? '' : '-rotate-90'}`} />
            </button>
            {open[group.status] && (
              <ul className="divide-y divide-line mt-1">
                {group.items.map((item) => (
                  <Row key={item.key} item={item} onUpdate={onUpdate} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 sm:px-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 bg-panel rounded-b-lg">
        <p className="text-sm text-ink-soft">
          {included.length} to import · <span className="font-semibold text-ink">{formatCurrency(total)}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={included.length === 0 && origin?.kind !== 'bank'}
            className="px-5 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {included.length === 0 ? 'Mark as reviewed' : `Import ${included.length} expense${included.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </section>
  );
}
