'use client';

import { Suspense, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { PlusIcon } from '@/lib/icons';
import { formatCurrency } from '@/lib/utils';
import { computeLedger, sharesHeld } from '@/features/investing/lib/ledger';
import type { InvestmentAccount, Trade, TradeInput } from '@/features/investing/lib/types';
import { useTrades } from '@/features/investing/hooks/useTrades';
import { lookUpSymbol } from '@/features/investing/hooks/useMarketData';
import TradeForm from '@/features/investing/components/TradeForm';
import TradeList from '@/features/investing/components/TradeList';
import Change from '@/features/investing/components/Change';

/** Transactions: what did I buy, sell and earn? Trades here are what Home's holdings are calculated from. */
export default function TransactionsPage() {
  return (
    // useSearchParams (?new=1 opens the form) needs a Suspense boundary on a prerendered page.
    <Suspense>
      <Trades />
    </Suspense>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <p className="text-xs uppercase tracking-widest text-ink-muted mb-1">{label}</p>
      <div className="text-lg sm:text-xl font-semibold text-ink tabular-nums">{children}</div>
    </div>
  );
}

function Trades() {
  const params = useSearchParams();
  const { trades, ledger, error, addTrade, updateTrade, removeTrade } = useTrades();
  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Trade | null>(null);
  const list = useMemo(() => trades ?? [], [trades]);

  const heldFor = useCallback(
    (symbol: string, account: InvestmentAccount, date: string) => sharesHeld(list, symbol, account, date, editing?.id),
    [list, editing]
  );

  /** Would the trades still add up (no sell larger than what was held)? */
  const check = (next: Trade[]) => computeLedger(next).problem?.message ?? null;
  const asTrade = (input: TradeInput, base?: Trade): Trade => ({ ...input, id: base?.id ?? 'new', createdAt: base?.createdAt ?? new Date().toISOString(), updatedAt: '' });

  const save = async (input: TradeInput): Promise<string | null> => {
    const next = editing ? list.map((t) => (t.id === editing.id ? asTrade(input, editing) : t)) : [...list, asTrade(input)];
    const problem = check(next);
    if (problem) return problem;
    if (input.type === 'buy' && !list.some((t) => t.symbol === input.symbol)) {
      try {
        if (!(await lookUpSymbol(input.symbol))) return `Couldn't find a price for ${input.symbol}. Check the ticker and try again.`;
      } catch (e) {
        return e instanceof Error ? e.message : `Couldn't check ${input.symbol}.`;
      }
    }
    const ok = editing ? await updateTrade(editing.id, input) : await addTrade(input);
    if (!ok) return null; // The hook shows the save error.
    setEditing(null);
    setFormOpen(false);
    return null;
  };

  const remove = async (trade: Trade) => {
    const problem = check(list.filter((t) => t.id !== trade.id));
    if (problem) return `Can't delete this ${trade.type}: ${problem} Delete or change that sale first.`;
    await removeTrade(trade.id);
    return null;
  };

  const open = ledger?.positions ?? [];
  const invested = open.reduce((sum, p) => sum + (p.cost ?? 0), 0);

  return (
    <AppShell loading={trades === null}>
      <PageTitle title="Transactions" subtitle="Your buys, sells and dividends. Holdings on Home are calculated from these.">
        {!formOpen && !editing && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Record a trade
          </button>
        )}
      </PageTitle>

      <div className="space-y-6">
        {(formOpen || editing) && (
          <section className="bg-panel border border-line rounded-lg p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">{editing ? 'Edit trade' : 'Record a trade'}</h2>
            <TradeForm
              key={editing?.id ?? 'new'}
              initial={editing ?? undefined}
              heldFor={heldFor}
              onSubmit={save}
              onCancel={() => {
                setEditing(null);
                setFormOpen(false);
              }}
            />
          </section>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {list.length === 0 ? (
          !formOpen && (
            <section className="bg-panel border border-line rounded-lg p-8 text-center">
              <p className="text-ink-muted mb-4">No trades yet. Record a buy and it shows up in your portfolio on Home.</p>
              <button type="button" onClick={() => setFormOpen(true)} className="px-5 py-2.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong font-medium">
                Record your first trade
              </button>
            </section>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Open positions">{open.length}</Stat>
              <Stat label="Invested (cost)">{formatCurrency(invested)}</Stat>
              <Stat label="Realized gains">{ledger && <Change amount={ledger.realizedTotal} />}</Stat>
              <Stat label="Dividends">{formatCurrency(ledger?.dividendsTotal ?? 0)}</Stat>
            </div>
            {ledger?.problem && <p className="text-sm text-amber-300">{ledger.problem.message}</p>}
            <TradeList
              trades={list}
              realized={ledger?.realized ?? {}}
              onEdit={(t) => {
                setFormOpen(false);
                setEditing(t);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={remove}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
