'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { QUICK_ADD_MAX_LENGTH } from '@/features/expenses/constants';
import type { ParsedExpense } from '@/features/expenses/lib/quickAdd';
import { ReceiptImageError, prepareReceiptImage } from '@/features/expenses/lib/receiptImage';

interface QuickAddInputProps {
  /** Called with the parsed fields; the parent pre-fills the form for the user to review. */
  onParsed: (expense: ParsedExpense) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; source: 'text' | 'receipt' }
  | { kind: 'done'; note: string | null }
  | { kind: 'error'; message: string };

/** POST to a parse endpoint; returns the parsed expense or an error message to show. */
async function requestParse(url: string, body: object): Promise<ParsedExpense | { error: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Something went wrong. Please try again.';
      return { error: message };
    }
    return data as ParsedExpense;
  } catch {
    return { error: "Couldn't reach the server. Is it running?" };
  }
}

export default function QuickAddInput({ onParsed }: QuickAddInputProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  // Release the last receipt preview when the form unmounts.
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const showPreview = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  const finish = (result: ParsedExpense | { error: string }) => {
    if ('error' in result) {
      setStatus({ kind: 'error', message: result.error });
      return;
    }
    onParsed(result);
    setStatus({ kind: 'done', note: result.note });
  };

  const today = () => format(new Date(), 'yyyy-MM-dd');

  const runText = async () => {
    const trimmed = text.trim();
    if (!trimmed || status.kind === 'loading') return;
    setStatus({ kind: 'loading', source: 'text' });
    showPreview(null);
    finish(await requestParse('/api/quick-add', { text: trimmed, today: today() }));
  };

  const runReceipt = async (file: File) => {
    if (status.kind === 'loading') return;
    setStatus({ kind: 'loading', source: 'receipt' });
    showPreview(URL.createObjectURL(file));
    let image;
    try {
      image = await prepareReceiptImage(file);
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof ReceiptImageError ? error.message : "Couldn't process that image.",
      });
      return;
    }
    finish(await requestParse('/api/receipt', { image, today: today() }));
  };

  const loading = status.kind === 'loading';

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <label htmlFor="quick-add" className="block text-sm font-medium text-gray-900 mb-1">
        ✨ Quick add
      </label>
      <p className="text-xs text-gray-600 mb-2">
        Describe the expense in your own words, or scan a receipt, and we&apos;ll fill in the form for you to check.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="quick-add"
          type="text"
          value={text}
          maxLength={QUICK_ADD_MAX_LENGTH}
          placeholder='e.g. "lunch at Chipotle 14.50 yesterday"'
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter fills the form instead of submitting it.
            if (e.key === 'Enter') {
              e.preventDefault();
              void runText();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void runText()}
            disabled={!text.trim() || loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading && status.source === 'text' ? 'Reading…' : 'Fill in'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
          >
            {loading && status.source === 'receipt' ? 'Reading receipt…' : '📷 Scan receipt'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Receipt photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Clear so choosing the same file again still fires onChange.
              e.target.value = '';
              if (file) void runReceipt(file);
            }}
          />
        </div>
      </div>
      <div aria-live="polite" className="mt-2 text-sm min-h-5 flex items-start gap-3">
        {preview && (
          <a href={preview} target="_blank" rel="noreferrer" className="shrink-0" title="Open the receipt">
            {/* A local blob: URL, so there's nothing for the image optimizer to do. */}
            <Image
              src={preview}
              alt="Receipt you scanned"
              width={64}
              height={80}
              unoptimized
              className="h-20 w-16 object-cover rounded border border-gray-300 bg-white"
            />
          </a>
        )}
        <div>
          {loading && status.source === 'receipt' && <p className="text-gray-600">Reading the receipt…</p>}
          {status.kind === 'done' && (
            <p className="text-gray-700">
              Filled in below. Check it, then save.
              {status.note && <span className="block text-amber-700">⚠️ {status.note}</span>}
            </p>
          )}
          {status.kind === 'error' && <p className="text-red-600">{status.message}</p>}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        What you type or scan here is sent to Anthropic&apos;s Claude API to read it.
      </p>
    </div>
  );
}
