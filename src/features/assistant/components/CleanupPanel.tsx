'use client';

import { useState } from 'react';
import { useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import { CLEANUP_INSTRUCTIONS, CLEANUP_LABEL } from '@/features/assistant/lib/cleanup';
import AssistantTranscript from '@/features/assistant/components/AssistantTranscript';

/**
 * One-click clean-up: Claude reviews every expense for duplicates, inconsistent vendor names
 * and wrong categories, and proposes fixes the user approves. Uses the assistant's tool loop.
 */
export default function CleanupPanel() {
  const chat = useAssistantChat();
  const [open, setOpen] = useState(false);

  const start = () => {
    chat.reset();
    setOpen(true);
    void chat.send(CLEANUP_LABEL, [CLEANUP_INSTRUCTIONS]);
  };

  const close = () => {
    chat.reset();
    setOpen(false);
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{CLEANUP_LABEL}</p>
          <p className="text-sm text-gray-600">
            Claude checks all your expenses for duplicates, messy vendor names and wrong categories. You approve every
            fix.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {chat.isRunning ? (
            <button
              type="button"
              onClick={chat.stop}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              {open ? 'Run again' : 'Start clean-up'}
            </button>
          )}
          {open && !chat.isRunning && (
            <button
              type="button"
              onClick={close}
              className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <AssistantTranscript chat={chat} hideUserMessages />
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        The expenses Claude looks at are sent to Anthropic&apos;s Claude API. Nothing changes until you approve it.
      </p>
    </div>
  );
}
