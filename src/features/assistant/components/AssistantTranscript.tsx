'use client';

import { ReactNode } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { formatDate } from '@/lib/utils';
import { APP_NOTE_PREFIX, useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import ProposalCard from '@/features/assistant/components/ProposalCard';
import { SearchIcon } from '@/lib/icons';

/*
 * Renders an assistant conversation: user messages (optional), Claude's replies, tool-call
 * chips, proposal cards, the in-progress turn and any error. Shared by the chat page and the
 * clean-up panel.
 */

export const TOOL_LABELS: Record<string, string> = {
  query_expenses: 'Looked up expenses',
  summarize_spending: 'Summarized spending',
  list_vendors: 'Listed vendors',
  find_possible_duplicates: 'Checked for duplicates',
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-raised px-3 py-1 text-xs text-ink-muted">
      <SearchIcon className="w-3.5 h-3.5 text-accent" />
      {children}
    </span>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-panel-raised px-4 py-2.5 text-ink whitespace-pre-wrap break-words">
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

interface AssistantTranscriptProps {
  chat: ReturnType<typeof useAssistantChat>;
  /** Hide the user's messages (the clean-up panel shows only Claude's side). */
  hideUserMessages?: boolean;
}

export default function AssistantTranscript({ chat, hideUserMessages = false }: AssistantTranscriptProps) {
  return (
    <>
    {chat.history.map((message, index) => {
      if (message.role === 'user') {
        if (hideUserMessages) return null;
        const text = userText(message);
        if (!text) return null; // tool results only
        return (
          <div key={index} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-accent-ink whitespace-pre-wrap break-words">
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
            <span className="w-2 h-2 rounded-full bg-ink-faint animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-ink-faint animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-ink-faint animate-bounce" />
          </div>
        )}
      </div>
    )}

    {chat.error && (
      <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-300">{chat.error}</p>
    )}
    </>
  );
}
