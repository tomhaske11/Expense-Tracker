'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Expense } from '@/features/expenses/types';
import { ASSISTANT_INPUT_MAX_LENGTH } from '@/features/assistant/lib/protocol';
import { useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import { CLEANUP_INSTRUCTIONS, CLEANUP_LABEL } from '@/features/assistant/lib/cleanup';
import AssistantTranscript from '@/features/assistant/components/AssistantTranscript';

const SUGGESTIONS = [
  'Why was last month more expensive than the month before?',
  'How much do I spend on food on weekends vs weekdays?',
  'Who are my top 5 vendors this year?',
];

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
              <button
                type="button"
                onClick={() => chat.send(CLEANUP_LABEL, [CLEANUP_INSTRUCTIONS])}
                className="px-3 py-2 text-sm text-left text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                {CLEANUP_LABEL}
              </button>
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

        <AssistantTranscript chat={chat} />
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
