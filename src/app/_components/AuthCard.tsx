import { ReactNode } from 'react';
import { Brand } from '@/app/_components/Brand';

/** Centered card used by the sign-in, sign-up and password pages. */
export default function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-panel border border-line rounded-lg p-8">
          <div className="mb-6">
            <Brand href={null} />
            <h1 className="mt-6 text-xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

export const INPUT =
  'w-full px-3 py-2 bg-panel-raised border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent';
export const PRIMARY =
  'w-full px-4 py-2.5 bg-accent text-accent-ink rounded-full font-medium hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
export const LABEL = 'block text-sm font-medium text-ink-soft mb-1';

/** Where to go after signing in: a same-site ?next= path, or home. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
