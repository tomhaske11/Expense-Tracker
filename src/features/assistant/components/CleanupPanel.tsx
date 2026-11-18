'use client';

import { useState } from 'react';
import { useAssistantChat } from '@/features/assistant/hooks/useAssistantChat';
import { CLEANUP_INSTRUCTIONS, CLEANUP_LABEL } from '@/features/assistant/lib/cleanup';
import AssistantTranscript from '@/features/assistant/components/AssistantTranscript';
import { StopIcon, WandIcon } from '@/lib/icons';

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
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-ink">
            <WandIcon className="w-5 h-5 text-accent" />
            {CLEANUP_LABEL}
          </p>
          <p className="text-sm text-ink-muted">
            Claude checks all your expenses for duplicates, messy vendor names and wrong categories. You approve every
            fix.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {chat.isRunning ? (
            <button
              type="button"
              onClick={chat.stop}
              className="flex items-center gap-1.5 px-4 py-2 bg-panel-raised text-ink border border-line rounded-full hover:border-red-400 hover:text-red-300 transition-colors text-sm font-medium"
            >
              <StopIcon className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="px-4 py-2 bg-accent text-accent-ink rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              {open ? 'Run again' : 'Start clean-up'}
            </button>
          )}
          {open && !chat.isRunning && (
            <button
              type="button"
              onClick={close}
              className="px-3 py-2 bg-panel text-ink-soft border border-line rounded-lg hover:bg-canvas transition-colors text-sm"
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

      <p className="mt-3 text-xs text-ink-muted">
        The expenses Claude looks at are sent to Anthropic&apos;s Claude API. Nothing changes until you approve it.
      </p>
    </div>
  );
}
