'use client';

import { useState } from 'react';
import { CATEGORY_ICONS } from '@/features/expenses/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProposedChange } from '@/features/assistant/lib/runTools';
import { ProposalState } from '@/features/assistant/hooks/useAssistantChat';

interface ProposalCardProps {
  state: ProposalState;
  onApply: (selectedIds: string[]) => void;
  onReject: () => void;
}

function Field({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after) return null;
  return (
    <span className="block">
      <span className="text-gray-500">{label}: </span>
      <span className="line-through text-gray-400">{before}</span> → <span className="font-medium text-gray-900">{after}</span>
    </span>
  );
}

function ChangeDetails({ change }: { change: ProposedChange }) {
  const { before, after } = change;
  return (
    <div className="min-w-0 flex-1 text-sm">
      <p className="text-gray-900">
        {CATEGORY_ICONS[before.category]} <span className="font-medium">{before.description}</span>
        <span className="text-gray-500">
          {' '}
          · {formatCurrency(before.amount)} · {formatDate(before.date)}
        </span>
      </p>
      {change.action === 'delete' ? (
        <p className="text-red-700 font-medium">Delete</p>
      ) : (
        after && (
          <p className="text-gray-700">
            <Field label="Category" before={before.category} after={after.category} />
            <Field label="Description" before={before.description} after={after.description} />
            <Field label="Amount" before={formatCurrency(before.amount)} after={formatCurrency(after.amount)} />
            <Field label="Date" before={formatDate(before.date)} after={formatDate(after.date)} />
          </p>
        )
      )}
      <p className="text-xs text-gray-500 mt-0.5">{change.reason}</p>
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
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Proposed changes</p>
          <p className="text-sm font-medium text-gray-900">{proposal.summary}</p>
        </div>
        {status === 'applied' && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            ✓ Applied {state.appliedCount}
          </span>
        )}
        {status === 'rejected' && (
          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">Rejected</span>
        )}
      </div>

      <ul className="space-y-2">
        {proposal.changes.map((change) => (
          <li key={change.expenseId} className="flex items-start gap-3 rounded-md bg-white p-3">
            {pending && (
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-purple-600"
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Apply {selected.size === proposal.changes.length ? 'all' : `${selected.size} selected`}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
