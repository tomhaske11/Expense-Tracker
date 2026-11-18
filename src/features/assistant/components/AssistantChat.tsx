'use client';

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type Anthropic from '@anthropic-ai/sdk';
import { Expense } from '@/features/expenses/types';
import { formatDate } from '@/lib/utils';
import { ASSISTANT_INPUT_MAX_LENGTH } from '@/features/assistant/lib/protocol';
import { APP_NOTE_PREFIX, useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import ProposalCard from '@/features/assistant/components/ProposalCard';

const SUGGESTIONS = [
  'Why was last month more expensive than the month before?',
  'How much do I spend on food on weekends vs weekdays?',
  'Who are my top 5 vendors this year?',
  'Find expenses that look like duplicates',
];

const TOOL_LABELS: Record<string, string> = {
  query_expenses: 'Looked up expenses',
  summarize_spending: 'Summarized spending',
  get_budget_streak: 'Checked budget streak',
  propose_changes: 'Drafting proposed changes',
};

function describeToolCall(name: string, input: unknown): string {
  const label = TOOL_LABELS[name] ?? name;
  if (typeof input !== 'object' || input === null) return label;
  const { start_date, end_date, group_by, category, search } = input as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof group_by === 'string') parts.push(`by ${group_by}`);
  if (typeof category === 'string') parts.push(category);
  if (typeof search === 'string' && search) parts.push(`“${search}”`);
  if (typeof start_date === 'string' && typeof end_date === 'string') {
    parts.push(`${formatDate(start_date)} – ${formatDate(end_date)}`);
  } else if (typeof start_date === 'string') {
    parts.push(`from ${formatDate(start_date)}`);
  } else if (typeof end_date === 'string') {
    parts.push(`until ${formatDate(end_date)}`);
  }
  return parts.length ? `${label}: ${parts.join(', ')}` : label;
}

function ToolChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
      <span aria-hidden>🔎</span>
      {children}
    </span>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-gray-900 whitespace-pre-wrap break-words">
      {text}
    </div>
  );
}

/** Text the user typed, without the app's own notes. */
function userText(message: Anthropic.Beta.BetaMessageParam): string {
  if (typeof message.content === 'string') return message.content;
  const texts: string[] = [];
  for (const block of message.content ?? []) {
    if (block.type === 'text' && !block.text.startsWith(APP_NOTE_PREFIX)) texts.push(block.text);
  }
  return texts.join('\n');
}

export default function AssistantChat({ expenses }: { expenses: Expense[] }) {
  const chat = useAssistantChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.history, chat.streamingText, chat.activeTools, chat.error]);

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No expenses to ask about yet</h2>
        <p className="text-gray-600 mb-6">Add a few expenses and the assistant can answer questions about your spending.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go add expenses
        </Link>
      </div>
    );
  }

  const submit = (text: string) => {
    if (!text.trim() || chat.isRunning) return;
    chat.send(text);
    setInput('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(input);
    }
  };

  const isEmpty = chat.history.length === 0 && !chat.isRunning;

  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col h-[calc(100vh-12rem)] min-h-[28rem]">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ask your money</h2>
          <p className="text-sm text-gray-500">Questions about your {expenses.length} expenses, answered by Claude</p>
        </div>
        {chat.history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              chat.reset();
              setInput('');
            }}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" aria-live="polite">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-700 font-medium mb-4">What would you like to know?</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="px-3 py-2 text-sm text-left text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.history.map((message, index) => {
          if (message.role === 'user') {
            const text = userText(message);
            if (!text) return null; // tool results only
            return (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-white whitespace-pre-wrap break-words">
                  {text}
                </div>
              </div>
            );
          }
          if (typeof message.content === 'string') {
            return <AssistantBubble key={index} text={message.content} />;
          }
          return (
            <div key={index} className="space-y-2">
              {(message.content ?? []).map((block, blockIndex) => {
                if (block.type === 'text' && block.text.trim()) {
                  return <AssistantBubble key={blockIndex} text={block.text} />;
                }
                if (block.type === 'tool_use') {
                  const proposal = block.name === 'propose_changes' ? chat.proposals[block.id] : undefined;
                  if (proposal) {
                    return (
                      <ProposalCard
                        key={block.id}
                        state={proposal}
                        onApply={(ids) => chat.applyProposal(block.id, ids)}
                        onReject={() => chat.rejectProposal(block.id)}
                      />
                    );
                  }
                  return (
                    <div key={block.id}>
                      <ToolChip>{describeToolCall(block.name, block.input)}</ToolChip>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })}

        {chat.isRunning && (
          <div className="space-y-2">
            {chat.activeTools.map((name, i) => (
              <div key={i}>
                <ToolChip>{TOOL_LABELS[name] ?? name}…</ToolChip>
              </div>
            ))}
            {chat.streamingText ? (
              <AssistantBubble text={chat.streamingText} />
            ) : (
              <div className="flex items-center gap-1 px-2 py-3" aria-label="Claude is thinking">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            )}
          </div>
        )}

        {chat.error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{chat.error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-gray-200 px-6 py-4">
        <div className="flex gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Ask about your spending
          </label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={ASSISTANT_INPUT_MAX_LENGTH}
            rows={1}
            placeholder="Ask about your spending…"
            className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {chat.isRunning ? (
            <button
              type="button"
              onClick={chat.stop}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Send
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Your questions and the expenses Claude looks up are sent to Anthropic&apos;s Claude API. Changes are saved only
          when you approve them.
        </p>
      </form>
    </div>
  );
}
