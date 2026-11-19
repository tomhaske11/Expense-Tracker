# expenseAI roadmap

The running list of enhancements. Update the status and date as items move, and add new items
at the bottom of the right section. Status: ✅ done · 🚧 in progress · ⏭️ next · 📋 planned.

Goal: a production web app and iPhone app that anyone in the US can use to connect their bank
and understand their spending. Freemium: free tier with usage caps, paid tier.

## Shipped

| Item | Shipped | PR |
|---|---|---|
| Natural-language quick add | 2026-11-18 | #2 |
| "Ask your money" assistant (tool-using chat) | 2026-11-18 | #3 |
| Receipt scanning | 2026-11-18 | #4 |
| Budget coach and saved daily budget | 2026-11-18 | #5 |
| One-click data clean-up | 2026-11-18 | #6 |
| Password gate and rate limits (superseded by accounts) | 2026-11-18 | #8 |
| expenseAI rebrand, dark black-and-teal UI, lucide icons | 2026-11-18 | #9 |
| Next.js 16.4.6 security update | 2026-11-18 | #10 |
| Backup and restore | 2026-11-18 | #12 |
| Bank and statement import pipeline (sandbox bank) | 2026-11-18 | #13 |
| Accounts and server-side data (Supabase) | 2026-11-18 | #14 |
| Production deploy on Vercel (expenseai-omega.vercel.app) | 2026-11-18 | — |
| Shared Claude rate limits (Upstash Redis) | 2026-11-18 | #15 |
| Navigation redesign: one place per job, mobile tab bar | 2026-11-19 | #16 |

## Production readiness

| Status | Item | Notes |
|---|---|---|
| ⏭️ | Anthropic monthly spend limit | Console setting; hard cap on the bill |
| 📋 | Transactional email provider (e.g. Resend) | Supabase's built-in email is heavily rate-limited |
| 📋 | Tests and CI | Vitest + Playwright (port the ad-hoc scripts); GitHub Actions on every PR |
| 📋 | Error monitoring and alerts | e.g. Sentry; alerts on Anthropic and Plaid spend |
| 📋 | Security headers, dependency updates, audit logs | Plus a security review before Plaid production |
| 📋 | Check `anon` grants in Supabase | RLS protects today; grants didn't revoke as expected |
| 📋 | Upgrade to Vercel Pro and Supabase Pro | Before charging users (commercial use, no pausing) |
| 📋 | Privacy policy, terms, data export | Disclose Anthropic and Plaid processing |

## Costs and monetization

| Status | Item | Notes |
|---|---|---|
| 📋 | Cost breakdown per feature | Log input/output tokens per Claude call and show cost per feature (quick add, receipts, coach, assistant, clean-up, imports) |
| 📋 | Free-tier usage caps | Per-user monthly Claude allowance; clear messaging when reached |
| 📋 | Billing (Stripe) and paid tier | Paid tier covers Claude and Plaid costs |
| 📋 | Try Claude Haiku 5.5 for simple extraction | Quick add, receipts, import suggestions, column mapping; test quality first |

## Banking

| Status | Item | Notes |
|---|---|---|
| 📋 | Plaid provider | Implements `BankProvider`; start production-approval paperwork early |
| 📋 | Background sync via Plaid webhooks | New transactions waiting when the app opens |
| 📋 | "New transactions to review" notifications | Push and email |

## iPhone app (Capacitor first)

| Status | Item | Notes |
|---|---|---|
| 📋 | Installable PWA | Quick win: home-screen app, offline cache |
| 📋 | Capacitor iOS app | Bundle the static pages; call the Vercel API with Bearer tokens |
| 📋 | Native features for App Review | Face ID lock, push notifications, native camera, haptics, share sheet |
| 📋 | Sign in with Apple, TestFlight, App Store submission | Apple Developer Program ($99/yr), privacy labels |

## Product features

| Status | Item | Notes |
|---|---|---|
| 📋 | Subscriptions and recurring-charges view | Yearly cost, price increases |
| 📋 | Category budgets with month-end forecast | "Food: $310 of $400, on pace for $520" |
| 📋 | Weekly coach digest (email or push) | Brings users back |
| 📋 | Income tracking, savings rate | Net cash flow, not just spending |
| 📋 | Tags, notes, split expenses, multi-currency | Smaller wins |
