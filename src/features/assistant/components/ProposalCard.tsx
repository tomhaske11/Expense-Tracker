'use client';

import { useState } from 'react';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProposedChange } from '@/features/assistant/lib/runTools';
import { ProposalState } from '@/features/assistant/hooks/useAssistantChat';
import { CheckIcon } from '@/lib/icons';

interface ProposalCardProps {
  state: ProposalState;
  onApply: (selectedIds: string[]) => void;
  onReject: () => void;
}

function Field({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  return (
    <span className="block">
      <span className="text-ink-muted">{label}: </span>
      <span className="line-through text-ink-faint">{before}</span> → <span className="font-medium text-ink">{after}</span>
    </span>
  );
}

function ChangeDetails({ change }: { change: ProposedChange }) {
  const { before, after } = change;
  return (
    <div className="min-w-0 flex-1 text-sm">
      <p className="text-ink">
        <CategoryIcon category={before.category} className="inline w-4 h-4 mr-1 -mt-0.5" /> <span className="font-medium">{before.description}</span>
        <span className="text-ink-muted">
          {' '}
          · {formatCurrency(before.amount)} · {formatDate(before.date)}
        </span>
      </p>
      {change.action === 'delete' ? (
        <p className="text-red-300 font-medium">Delete</p>
      ) : (
        after && (
          <p className="text-ink-soft">
            <Field label="Category" before={before.category} after={after.category} />
            <Field label="Description" before={before.description} after={after.description} />
            <Field label="Amount" before={formatCurrency(before.amount)} after={formatCurrency(after.amount)} />
            <Field label="Date" before={formatDate(before.date)} after={formatDate(after.date)} />
          </p>
        )
      )}
      <p className="text-xs text-ink-muted mt-0.5">{change.reason}</p>
    </div>
  );
}

/** A propose_changes call: the user picks which changes to apply, or rejects them all. */
export default function ProposalCard({ state, onApply, onReject }: ProposalCardProps) {
  const { proposal, status } = state;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposal.changes.map((c) => c.expenseId)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pending = status === 'pending';

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Proposed changes</p>
          <p className="text-sm font-medium text-ink">{proposal.summary}</p>
        </div>
        {status === 'applied' && (
          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-strong">
            <CheckIcon className="inline w-3.5 h-3.5 -mt-0.5" /> Applied {state.appliedCount}
          </span>
        )}
        {status === 'rejected' && (
          <span className="shrink-0 rounded-full bg-panel-raised px-2 py-0.5 text-xs font-medium text-ink-soft">Rejected</span>
        )}
      </div>

      <ul className="space-y-2">
        {proposal.changes.map((change) => (
          <li key={change.expenseId} className="flex items-start gap-3 rounded-md bg-panel p-3 border border-line">
            {pending && (
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-400"
                checked={selected.has(change.expenseId)}
                onChange={() => toggle(change.expenseId)}
                aria-label={`Include change to ${change.before.description}`}
              />
            )}
            <ChangeDetails change={change} />
          </li>
        ))}
      </ul>

      {pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApply([...selected])}
            disabled={selected.size === 0}
            className="px-4 py-2 bg-accent text-accent-ink rounded-lg hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Apply {selected.size === proposal.changes.length ? 'all' : `${selected.size} selected`}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-4 py-2 bg-panel text-ink-soft border border-line rounded-lg hover:bg-canvas transition-colors text-sm font-medium"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
