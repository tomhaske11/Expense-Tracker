'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatIcon, HomeIcon, ListIcon, PieIcon, PlusIcon, UserIcon, type Icon } from '@/lib/icons';
import SyncErrorBanner from '@/app/_components/SyncErrorBanner';
import { Brand } from '@/app/_components/Brand';

/*
 * The signed-in app's frame. Each destination answers one question:
 *   Home          how are my investments doing, and what's moving the market?
 *   Transactions  what did I spend, and is it right?
 *   Spending      where does my money go over time?
 *   Ask           answer a question about my money
 *   Add           record something (an action: typed, receipt, manual, or import)
 *   Account       manage my account and my data (behind the profile icon)
 * Desktop shows these in the header; mobile shows a bottom tab bar with Add in the middle.
 */

interface Destination {
  href: string;
  label: string;
  icon: Icon;
  /** Other paths that belong to this destination. */
  also?: string[];
}

const HOME: Destination = { href: '/', label: 'Home', icon: HomeIcon };
const TRANSACTIONS: Destination = { href: '/transactions', label: 'Transactions', icon: ListIcon };
const SPENDING: Destination = { href: '/spending', label: 'Spending', icon: PieIcon };
const ASK: Destination = { href: '/assistant', label: 'Ask', icon: ChatIcon };
const ADD: Destination = { href: '/add', label: 'Add', icon: PlusIcon, also: ['/import'] };

const isActive = (d: Destination, pathname: string) =>
  [d.href, ...(d.also ?? [])].some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));

interface AppShellProps {
  children: ReactNode;
  /** While true, show the spinner instead of the page content (the frame stays). */
  loading?: boolean;
}

export default function AppShell({ children, loading = false }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-canvas/90 backdrop-blur border-b border-line sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Brand />
            <nav aria-label="Main" className="hidden sm:flex items-center gap-1">
              {[HOME, TRANSACTIONS, SPENDING, ASK].map((d) => (
                <HeaderLink key={d.href} destination={d} active={isActive(d, pathname)} />
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href={ADD.href}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </Link>
              <Link
                href="/account"
                aria-label="Account"
                title="Account"
                aria-current={pathname.startsWith('/account') ? 'page' : undefined}
                className={`p-2 rounded-full transition-colors ${pathname.startsWith('/account') ? 'text-accent' : 'text-ink-muted hover:text-accent'}`}
              >
                <UserIcon className="w-6 h-6" />
              </Link>
            </div>
          </div>
          <SyncErrorBanner />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 sm:pb-12">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-ink-muted">Loading…</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      <nav
        aria-label="Main"
        className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-canvas/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          {[HOME, TRANSACTIONS, ADD, SPENDING, ASK].map((d) =>
            d === ADD ? (
              <Link key={d.href} href={d.href} aria-label="Add" className="flex items-center justify-center">
                <span
                  className={`w-12 h-12 rounded-full flex items-center justify-center bg-accent text-accent-ink ${
                    isActive(d, pathname) ? 'ring-2 ring-accent-strong ring-offset-2 ring-offset-canvas' : ''
                  }`}
                >
                  <PlusIcon className="w-6 h-6" />
                </span>
              </Link>
            ) : (
              <TabLink key={d.href} destination={d} active={isActive(d, pathname)} />
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

/** Page heading: one per page, at the top of the content. */
export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function HeaderLink({ destination: d, active }: { destination: Destination; active: boolean }) {
  return (
    <Link
      href={d.href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:text-ink'
      }`}
    >
      <d.icon className="w-4 h-4" />
      {d.label}
    </Link>
  );
}

function TabLink({ destination: d, active }: { destination: Destination; active: boolean }) {
  return (
    <Link
      href={d.href}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-accent' : 'text-ink-muted'}`}
    >
      <d.icon className="w-5 h-5" />
      {d.label}
    </Link>
  );
}
