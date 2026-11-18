import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, UserIcon } from '@/lib/icons';
import SyncErrorBanner from '@/app/_components/SyncErrorBanner';
import { Brand } from '@/app/_components/Brand';

/**
 * Sticky black header shared by every page: the expenseAI brand on the left and either
 * custom actions (`children`) or a "Back to Dashboard" link on the right.
 */
export default function AppHeader({ children, below }: { children?: ReactNode; below?: ReactNode }) {
  return (
    <header className="bg-canvas/90 backdrop-blur border-b border-line sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Brand />
          <div className="flex items-center gap-2">
          {children ?? (
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
          )}
            <Link href="/account" aria-label="Account" title="Account" className="p-2 rounded-full text-ink-muted hover:text-accent transition-colors">
              <UserIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <SyncErrorBanner />
        {below}
      </div>
    </header>
  );
}
