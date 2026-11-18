'use client';

import { useCallback, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import { getExpensesSnapshot, useExpenses } from '@/features/expenses/hooks/useExpenses';
import { Expense } from '@/features/expenses/types';
import { formatCurrency } from '@/lib/utils';
import { ASSISTANT_MAX_STEPS, AssistantStreamEvent } from '@/features/assistant/lib/protocol';
import {
  Proposal,
  parseProposeChangesInput,
  runReadTool,
  validateProposal,
} from '@/features/assistant/lib/runTools';

/*
 * Client side of the assistant. The browser owns the conversation: it sends the history to
 * /api/assistant, streams Claude's reply, runs any tools Claude asks for against localStorage,
 * and loops until Claude answers. Claude never writes data: propose_changes only records a
 * Proposal, and the user applies it from the UI. The chat lives in memory for this page visit.
 */

type MessageParam = Anthropic.Beta.BetaMessageParam;
type ContentBlock = Anthropic.Beta.BetaContentBlock;
type ToolResult = Anthropic.Beta.BetaToolResultBlockParam;

export const APP_NOTE_PREFIX = '[App note]';

export type ProposalStatus = 'pending' | 'applied' | 'rejected';
export interface ProposalState {
  proposal: Proposal;
  status: ProposalStatus;
  /** How many changes were applied (set when status is 'applied'). */
  appliedCount?: number;
}

class TurnError extends Error {}

/** POST the history and stream one Claude turn. Resolves with the finished assistant message. */
async function streamTurn(
  messages: MessageParam[],
  signal: AbortSignal,
  onEvent: (event: AssistantStreamEvent) => void
): Promise<{ content: ContentBlock[]; stopReason: string | null }> {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!response.ok || !response.body) {
    const data: { error?: string } | null = await response.json().catch(() => null);
    throw new TurnError(data?.error ?? 'The assistant is unavailable right now. Please try again.');
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finished: { content: ContentBlock[]; stopReason: string | null } | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line) as AssistantStreamEvent;
      if (event.type === 'error') throw new TurnError(event.error);
      if (event.type === 'done') {
        finished = { content: event.content as ContentBlock[], stopReason: event.stopReason };
      } else {
        onEvent(event);
      }
    }
  }

  if (!finished) throw new TurnError('The connection dropped before Claude finished. Please try again.');
  return finished;
}

/** Context for the first message: today's date and the shape of the data. */
function introNote(expenses: Expense[], today: Date): string {
  const dateLine = `Today is ${format(today, 'EEEE, yyyy-MM-dd')}.`;
  if (expenses.length === 0) return `${APP_NOTE_PREFIX} ${dateLine} The user has no expenses recorded yet.`;
  const dates = expenses.map((e) => e.date).sort();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return `${APP_NOTE_PREFIX} ${dateLine} The user has ${expenses.length} expenses from ${dates[0]} to ${dates[dates.length - 1]}, totalling ${formatCurrency(total)}.`;
}

export function useAssistantChat() {
  const { updateExpense, deleteExpense } = useExpenses();
  const [history, setHistory] = useState<MessageParam[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Record<string, ProposalState>>({});

  const historyRef = useRef<MessageParam[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  // Outcomes of proposals, sent to Claude with the user's next message.
  const pendingNotesRef = useRef<string[]>([]);

  const commit = useCallback((next: MessageParam[]) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  /** Run the tools in one assistant message. Returns the tool_result blocks. */
  const runTools = useCallback((content: ContentBlock[]): ToolResult[] => {
    const expenses = getExpensesSnapshot();
    const today = new Date();
    const results: ToolResult[] = [];

    for (const block of content) {
      if (block.type !== 'tool_use') continue;
      const reply = (result: unknown, isError = false) =>
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
          ...(isError && { is_error: true }),
        });

      if (block.name === 'propose_changes') {
        const input = parseProposeChangesInput(block.input);
        if ('error' in input) {
          reply({ error: input.error }, true);
          continue;
        }
        const { proposal, rejected } = validateProposal(input.data, expenses, today);
        if (proposal.changes.length === 0) {
          reply({ error: 'None of the changes are valid, so nothing was shown to the user.', rejected }, true);
          continue;
        }
        setProposals((prev) => ({ ...prev, [block.id]: { proposal, status: 'pending' } }));
        reply({
          status: 'shown_to_user_for_approval',
          valid_changes: proposal.changes.length,
          rejected,
          note: 'Nothing has been saved. The outcome arrives in a later [App note].',
        });
        continue;
      }

      const outcome = runReadTool(block.name, block.input, expenses, today);
      if (outcome.ok) reply(outcome.result);
      else reply({ error: outcome.error }, true);
    }
    return results;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || abortRef.current) return;

      const before = historyRef.current;
      const notes = [...pendingNotesRef.current];
      if (before.length === 0) notes.unshift(introNote(getExpensesSnapshot(), new Date()));
      pendingNotesRef.current = [];

      const userMessage: MessageParam = {
        role: 'user',
        content: [...notes.map((note) => ({ type: 'text' as const, text: note })), { type: 'text', text: trimmed }],
      };
      let messages = [...before, userMessage];
      commit(messages);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);
      setError(null);

      try {
        for (let step = 0; step < ASSISTANT_MAX_STEPS; step++) {
          setStreamingText('');
          setActiveTools([]);
          const { content, stopReason } = await streamTurn(messages, controller.signal, (event) => {
            if (event.type === 'text') setStreamingText((prev) => prev + event.text);
            if (event.type === 'tool') setActiveTools((prev) => [...prev, event.name]);
          });

          if (stopReason === 'refusal') {
            // Drop the whole exchange so the user can rephrase from a clean history.
            commit(before);
            pendingNotesRef.current = notes.filter((note) => !note.startsWith(`${APP_NOTE_PREFIX} Today is`));
            setError("Claude can't help with that request. Try rephrasing it.");
            return;
          }

          const hasToolUse = content.some((block) => block.type === 'tool_use');
          if (stopReason === 'max_tokens' && hasToolUse) {
            setError('The reply was cut off. Please try again.');
            return;
          }

          messages = [...messages, { role: 'assistant', content }];
          commit(messages);

          if (stopReason !== 'tool_use' || !hasToolUse) {
            if (stopReason === 'max_tokens') setError('The reply was cut off.');
            return;
          }

          messages = [...messages, { role: 'user', content: runTools(content) }];
          commit(messages);
        }
        setError(`Stopped after ${ASSISTANT_MAX_STEPS} steps. Ask a follow-up to let Claude continue.`);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof TurnError ? err.message : 'Something went wrong. Please try again.');
        if (!(err instanceof TurnError)) console.error('Assistant turn failed:', err);
      } finally {
        abortRef.current = null;
        setIsRunning(false);
        setStreamingText('');
        setActiveTools([]);
      }
    },
    [commit, runTools]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pendingNotesRef.current = [];
    commit([]);
    setProposals({});
    setError(null);
    setStreamingText('');
    setActiveTools([]);
    setIsRunning(false);
  }, [commit]);

  /** Apply the selected changes of a proposal through useExpenses (the only place data is written). */
  const applyProposal = useCallback(
    (toolUseId: string, selectedIds: string[]) => {
      const state = proposals[toolUseId];
      if (!state || state.status !== 'pending') return;

      const current = new Map(getExpensesSnapshot().map((e) => [e.id, e]));
      const selected = new Set(selectedIds);
      let applied = 0;
      for (const change of state.proposal.changes) {
        if (!selected.has(change.expenseId) || !current.has(change.expenseId)) continue;
        if (change.action === 'delete') {
          deleteExpense(change.expenseId);
        } else if (change.after) {
          updateExpense(change.expenseId, {
            date: change.after.date,
            amount: String(change.after.amount),
            category: change.after.category,
            description: change.after.description,
          });
        }
        applied++;
      }

      setProposals((prev) => ({ ...prev, [toolUseId]: { ...state, status: 'applied', appliedCount: applied } }));
      pendingNotesRef.current.push(
        `${APP_NOTE_PREFIX} The user applied ${applied} of ${state.proposal.changes.length} changes from the proposal "${state.proposal.summary}". Those changes are now saved.`
      );
    },
    [proposals, updateExpense, deleteExpense]
  );

  const rejectProposal = useCallback(
    (toolUseId: string) => {
      const state = proposals[toolUseId];
      if (!state || state.status !== 'pending') return;
      setProposals((prev) => ({ ...prev, [toolUseId]: { ...state, status: 'rejected' } }));
      pendingNotesRef.current.push(
        `${APP_NOTE_PREFIX} The user rejected the proposal "${state.proposal.summary}". Nothing was changed.`
      );
    },
    [proposals]
  );

  return {
    history,
    streamingText,
    activeTools,
    isRunning,
    error,
    proposals,
    send,
    stop,
    reset,
    applyProposal,
    rejectProposal,
  };
}
