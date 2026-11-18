# Bank & statement import

How transactions get from a bank or a statement file into expenses, and how to add a real
bank aggregator. Screen: `/import` (Import tab on the home page).

## Flow

```
Sources                              Pipeline (features/imports/lib/pipeline.ts)          Save
┌────────────────────────┐   ┌──────────────────────────────────────────────────┐   ┌──────────────┐
│ Statement file          │   │ buildReview():                                   │   │ ImportReview │
│  CSV  → statements.ts   │──▶│  1. drop in-batch duplicate external ids         │──▶│ user edits,  │──▶ useExpenses
│  OFX  → statements.ts   │   │  2. already imported (same source.externalId)    │   │ opts in/out  │    .importExpenses
│  PDF  → /api/imports/pdf│   │  3. hold back: pending, money in, transfers,     │   └──────────────┘    (merge)
│ Bank → /api/bank/sync   │──▶│     other currencies                             │          │
│  (BankProvider)         │   │  4. possible duplicates of existing expenses     │          ▼ bank only
└────────────────────────┘   │  5. category + name: user's history → source     │   POST /api/bank/ack
                              │     hint → Claude (/api/imports/suggest)         │   (cursor moves only
                              └──────────────────────────────────────────────────┘    after the save)
```

Every source produces `SourceTransaction` (`features/imports/types.ts`): external id, account,
date, amount (positive = money out), currency, raw description, optional merchant name,
pending flag and the source's own category hint. The pipeline never knows where data came from.

Saved expenses carry `source: { kind, externalId, connectionId?, accountId?, rawDescription }`.
That is how re-imports and re-syncs are recognized (step 2) and how later imports match an
expense's original bank text (step 4).

### Duplicate rules (step 4)
Same amount to the cent, within 3 days, and either a shared vendor word (comparing merchant
name and raw description with the expense's description and stored raw description) or a
non-round amount within 1 day. Each existing expense matches at most one transaction.
Possible duplicates are shown but not ticked.

### What goes to Claude
- CSV: nothing, if `guessMapping()` recognizes the columns; otherwise the first 12 rows.
- Suggestions: only transactions whose vendor isn't in the user's history and that have no
  merchant name + category hint from the source. Batches of 100.
- PDF: the whole file (Claude reads it).

All three routes use `limitClaudeRequest`.

## Bank layer (server only: `features/imports/server/bank/`)

| File | Role |
|---|---|
| `provider.ts` | `BankProvider` interface: `createLinkToken`, `exchangePublicToken`, `sync(cursor)`, `removeItem` |
| `mockProvider.ts` | Sandbox bank: deterministic history per access token (60 days), pending charges that post 2 days later under new ids, refunds, paychecks, card payments, a EUR charge |
| `connectionStore.ts` | `ConnectionStore` interface + file implementation (`.data/bank-connections.json`, mode 600, gitignored); AES-256-GCM token sealing |
| `index.ts` | `getBankProvider()` from `BANK_PROVIDER` (default `mock`) |

Routes (`src/app/api/bank/`): `link`, `exchange`, `connections` (GET, DELETE `?id=`), `sync`,
`ack`. Responses never include access tokens. The stored cursor only advances on `ack`, so a
cancelled review is offered again. Connections are keyed by `getUserId()` (`lib/session.ts`,
`'owner'` until real accounts exist).

### Environment

| Variable | Purpose |
|---|---|
| `BANK_PROVIDER` | `mock` (default). Add more ids in `bank/index.ts`. |
| `BANK_TOKEN_KEY` | Encrypts stored access tokens. **Required** for any live provider (sealing refuses without it). |
| `BANK_CONNECTIONS_FILE` | Override the store path (tests). |

## Adding a real provider (e.g. Plaid)

1. Implement `BankProvider` in `bank/plaidProvider.ts` with `live = true`: link token creation,
   public-token exchange, `/transactions/sync` (map `transaction_id` → `externalId`,
   `amount` sign is already "positive = money out", `personal_finance_category.primary` →
   `categoryHint`, `merchant_name` → `merchantName`, `pending`), and item removal.
2. Register it in `getBankProvider()`; secrets go in `.env.local`; set `BANK_TOKEN_KEY`.
3. In `ImportCenter`, open the provider's own widget (e.g. Plaid Link with the link token)
   instead of the sandbox `ConnectDialog`, and pass its public token to `finishLink()`.
4. Before going multi-user: replace `FileConnectionStore` with a database-backed
   `ConnectionStore`, make `getUserId()` return the signed-in user, and handle provider
   webhooks to sync in the background.

## Tests

No test framework is installed yet. The checks used while building this (pipeline, CSV/OFX
parsing, mock provider incremental sync, token sealing, and an end-to-end headless-Chrome run)
were scripts outside the repo; adding Vitest and porting them is the natural next step.
