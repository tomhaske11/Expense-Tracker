'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Expense } from '@/features/expenses/types';
import { ASSISTANT_INPUT_MAX_LENGTH } from '@/features/assistant/lib/protocol';
import { useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import { CLEANUP_INSTRUCTIONS, CLEANUP_LABEL } from '@/features/assistant/lib/cleanup';
import AssistantTranscript from '@/features/assistant/components/AssistantTranscript';
import { ChatIcon, SendIcon, StopIcon, WandIcon } from '@/lib/icons';

const SPENDING_SUGGESTIONS = [
  'Why was last month more expensive than the month before?',
  'Who are my top 5 vendors this year?',
];
const MARKET_SUGGESTIONS = [
  'Is the S&P 500 above its 50-day and 200-day moving averages?',
  'When the S&P 500 drops 10% from its high, what has usually happened over the next 3 months?',
  'What are the support and resistance levels for QQQ?',
];

export default function AssistantChat({ expenses }: { expenses: Expense[] }) {
  const chat = useAssistantChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.history, chat.streamingText, chat.activeTools, chat.error]);

  // Market questions work without any expenses; spending examples appear once there's spending.
  const SUGGESTIONS = expenses.length ? [...MARKET_SUGGESTIONS.slice(0, 2), ...SPENDING_SUGGESTIONS] : MARKET_SUGGESTIONS;

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
    <div className="bg-panel rounded-lg flex flex-col h-[calc(100vh-12rem)] min-h-[28rem] border border-line">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Ask your money</h2>
          <p className="text-sm text-ink-muted">Your spending, your investments and market trends, answered by Claude</p>
        </div>
        {chat.history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              chat.reset();
              setInput('');
            }}
            className="px-3 py-1.5 text-sm text-ink-muted border border-line rounded-lg hover:bg-canvas transition-colors"
          >
            New chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" aria-live="polite">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <ChatIcon className="w-10 h-10 mb-3 text-accent" />
            <p className="text-ink-soft font-medium mb-4">What would you like to know?</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {expenses.length > 0 && (
                <button
                  type="button"
                  onClick={() => chat.send(CLEANUP_LABEL, [CLEANUP_INSTRUCTIONS])}
                  className="px-3 py-2 text-sm text-left text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent/15 transition-colors"
                >
                  <WandIcon className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                  {CLEANUP_LABEL}
                </button>
              )}
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="px-3 py-2 text-sm text-left text-ink-soft bg-panel-raised border border-line rounded-lg hover:border-accent hover:text-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AssistantTranscript chat={chat} />
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-line px-6 py-4">
        <div className="flex gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Ask about your spending or the markets
          </label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={ASSISTANT_INPUT_MAX_LENGTH}
            rows={1}
            placeholder="Ask a question…"
            className="flex-1 resize-none px-3 py-2 border border-line rounded-lg bg-panel focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {chat.isRunning ? (
            <button
              type="button"
              onClick={chat.stop}
              className="flex items-center gap-1.5 px-4 py-2 bg-panel-raised text-ink border border-line rounded-full hover:border-red-400 hover:text-red-300 transition-colors font-medium"
            >
              <StopIcon className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <SendIcon className="w-4 h-4" />
              Send
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Your questions, and the expenses and holdings Claude looks up, are sent to Anthropic&apos;s Claude API. Changes are saved only
          when you approve them.
        </p>
      </form>
    </div>
  );
}
