import Link from 'next/link';

/** The expenseAI mark: a teal wedge rising left to right, like a chart climbing. */
export function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M4 26 26 6v20z" fill="var(--color-accent)" />
      <path d="M12 26 26 13" stroke="var(--color-canvas)" strokeWidth="2" />
    </svg>
  );
}

/** Mark + "expenseAI" wordmark. Links home unless `href` is null. */
export function Brand({ href = '/' }: { href?: string | null }) {
  const content = (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-xl font-semibold tracking-tight text-ink">
        expense<span className="text-accent">AI</span>
      </span>
    </span>
  );
  if (href === null) return content;
  return (
    <Link href={href} className="hover:opacity-80 transition-opacity" aria-label="expenseAI home">
      {content}
    </Link>
  );
}
