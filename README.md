# Where'd It Go?

A local-first expense tracker. No account, database, or financial API is involved.
Each browser/device keeps its own setup, budget preference, theme, and expenses.

## Development

```sh
npm run dev
```

Open http://localhost:3000. Custom CSS uses native Next.js processing; only
`app/tailwind.css` runs through the Tailwind Turbopack loader. Offline caching is
turned off in development so it cannot serve stale styles during hot reload.

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm start
```

## First visit and return visits

1. The paper detective welcomes a new user with **Get started**, without a header.
2. Three short steps ask for an optional name, tracking goal, and optional monthly
   budget. Every answer and the current step save immediately.
3. Completing setup saves answers first, then animates the centered mascot into
   the real header position before revealing the header and tracker. Reduced
   motion skips the flight. Reopening the app goes
   straight back to the tracker; unfinished setup resumes at its saved step.
4. **Your setup** reopens those answers. Editing setup never clears transactions.

The tracker has Log, Entries, Catch-Up, and Settings tabs. It uses the chosen name and goal. A budget is a calendar-month expense
limit, not a bank balance. Spending is summed in integer cents. Going over budget
shows a negative remainder. Without a budget, the dashboard shows recorded
spending and entry count. Older expenses remain in history across months.

## Storage

- `whereditgo-transactions-v1`: existing transaction records; never rename or clear.
- `whereditgo-setup-v1`: setup answers, draft step, completion, optional budget,
  colorway, learning, motion, and confirmation timing preferences.
- `whereditgo-theme-v1`: dark/light preference.

Opening the app does not seed data or overwrite storage. Invalid saved records
stay untouched. Storage failures show a warning and retain changes for the current
visit. Normal closing/reopening preserves data; clearing site data, private browsing,
or browser storage eviction can remove it. This is not a cloud backup. Different
origins (including ports, browser profiles, and localhost versus a LAN address)
have separate storage.

## Mobile and home screen

The layout includes safe-area spacing, comfortable controls, decimal keyboard for
budget entry, reduced-motion support, and a standalone manifest. App icons are
rendered from the existing mascot at 192px, 512px, and 180px for Apple devices.

On iPhone, use Safari → Share → Add to Home Screen. On Android, use the browser
menu → Install app / Add to Home screen. A phone needs an HTTPS origin for service
workers; your computer's HTTP LAN address is not equivalent to localhost on the
phone. A first successful online production visit is needed to cache the app.

Production registers `public/sw.js`. It caches only the public shell, scripts,
styles, mascot, and icons. It never sends local expense/setup data anywhere.
Navigation is network-first with an offline shell fallback; immutable app assets
are cache-first. Updates wait until existing app tabs close. New shell cache
versions must increment `SHELL_CACHE`, and activation removes only this app's old
shell caches. A production worker is disabled/unregistered when switching the same
origin back to development.

## Code boundaries

- `app/page.tsx`: loads local setup and chooses welcome/setup or the tracker.
- `components/welcome-flow.tsx`: greeting and four-step setup.
- `components/dashboard-arrival.tsx`: one-time mascot-to-Log completion handoff.
- `components/expense-dashboard.tsx`: tab state and the local transaction actions.
- `components/suggestion-prompt.tsx`: pauseable confirmation for amount-only logging.
- `components/transaction-editor.tsx`: corrections and backdated remembered entries.
- `components/tracker-settings.tsx`: grouped local preferences, profile, and budget.
- `components/bottom-tabs.tsx`: accessible keyboard-aware bottom navigation.
- `lib/patterns.ts`: transparent, history-based expense suggestions.
- `lib/auto-dismiss.ts`: independently pauseable countdown reasons.
- `components/app-header.tsx`: shared brand and the reactive question-mark wordmark.
- `lib/setup-store.ts`: validated setup persistence, including incomplete drafts.
- `lib/transaction-store.ts`: existing expense persistence and cross-tab updates.
- `lib/theme.ts`: reversible theme reveal without low-contrast color fades.
- `app/globals.css`: shared colors, motion, layout, and responsive styles.

## Smart logging and Catch-Up

After one named expense, logging the same amount such as `95` can suggest
`monster`. Only manual or explicitly confirmed entries teach the pattern. The
suggested expense saves immediately, stays editable, and remains marked as a
suggestion when its prompt closes. Unknown amounts save with an unlabeled name.
Catch-Up reviews these loose ends and adds forgotten purchases on their original
dates; account-balance reconciliation is not implemented.

Settings can disable learning, keep prompts open, choose Coral/Iris/Lime accents,
reduce motion, and update the profile and monthly budget. Dark/light mode lives
there too. JSON download includes the current records and preferences. Import
previews and merges new entries and sources while preserving current corrections.

## Browser checks

```sh
npx playwright install chromium webkit
npm run build
npm run test:e2e
```

The suite starts a local production server on port 3100 and uses fresh, isolated
browser contexts. It never touches your existing browser data. Temporary records
are created only inside those contexts. Set `PLAYWRIGHT_BROWSERS_PATH` if using a
custom browser-download folder. Artifacts are written to ignored `test-results/`.

Tests cover local persistence, correction without duplication, Yes/No/expiry,
focus pauses, filtering, delete/Undo, preferences, negative budget remainders,
backup download, keyboard tabs, 320px layouts, and offline reopening/logging in
Chromium and mobile WebKit. Source tests cover arithmetic and inference edge
cases. Physical phone installation and soft-keyboard behavior still require
real-device testing. See `docs/product-decisions.md` for the reference review.

## Payment sources

Setup now offers Cash, GCash, Maya, and custom nicknames for bank accounts or cards.
Settings manages sources and their default; archiving keeps historical references.
Log uses the chosen source, the editor can reassign a purchase, and Entries filters
spending by source. Legacy expenses remain Unassigned. Accounts live in the existing
setup key; expenses carry an optional accountId. Backups include both. Sources now optionally track locally reconciled balances or credit-card amounts
owed; they do not connect to a bank or record transfers.

Notification capture is not implemented. A browser/home-screen PWA cannot read
other apps' notifications. Android native notification access could support an
on-device companion; iOS has no equivalent public cross-app notification listener.
See docs/notification-capture.md for platform scope and the future ingestion plan.

## Daily-use interface

Log keeps quick entry, a chosen source, usuals, and compact daily/monthly context.
Entries defaults to this month, with last month, all time, and custom dates. Daily
subtotals, expandable category/source breakdowns, advanced filters, and CSV export
all use the same selected records. Custom categories can be created in the editor
and reused from history. Delete is inside the editor and Undo remains available.

Catch-Up checks one item at a time; Later leaves the saved record unchanged.
Multiline entry accepts up to 25 expenses for one date/source, previews every line,
and saves only on explicit acceptance. Invalid lines block the entire batch.

Settings uses expandable groups. Backup import accepts the app's version-1 JSON,
previews new/existing/conflicting counts, keeps local versions of existing IDs,
and remaps colliding payment-source IDs so history is not relabeled. It merges
expenses and sources, not profile/preferences. JSON files are limited to 5 MB and
10,000 entries per import. CSV exports the current Entries view and neutralizes
spreadsheet formula prefixes in text. No data is uploaded.

- `components/entries-panel.tsx`, `lib/spending.ts`: period views and breakdowns.
- `components/batch-catch-up.tsx`, `lib/batch-entry.ts`: explicit batch preview.
- `components/data-tools.tsx`, `lib/backup.ts`: local recovery and filtered export.
- `docs/research/tarsi-2026-11-12/analysis.md`: Tarsi research, fresh-screen audit,
  before/after images, design decisions, audience hypotheses, and evidence limits.

## Glass navigation and contextual companion

The current UI uses a peso-led amount field plus an optional expense name.
Amount-only suggestions, payment-source selection, editing, and local storage are
unchanged. The floating glass-style dock has an interruptible sliding selection;
Solid navigation in Appearance and system contrast/transparency preferences provide
opaque alternatives. Motion preferences apply to both the dock and the character.

The header is wordmark-only. A larger waiting detective leans on the Log form,
inspects a suggested amount, and briefly salutes after saving. Catch-Up uses the
inspection and satisfied poses. The service worker caches the new transparent
assets for offline use. This is a CSS interpretation, not native Apple optics.
See docs/research/glass-refresh-2026-11-13/design-notes.md for captures and prompts.

## Progressive logging and appearance

Iris is now the default accent. Appearance has a keyboard/pointer color wheel,
strength and hex controls, persistent custom colors, and readable light/dark text.
Log keeps amount-only saving as its first path; optional names are collapsed.
Use words accepts short purchase notes with a date and a saved source. Confirmed
history teaches amount/source/time patterns locally; unanswered guesses never
train the engine. New expense names capitalize their first letter. The detective
blinks, winks, and reacts to a poke, with reduced-motion support.
See `docs/research/progressive-log-2026-11-13/design-notes.md` for parser limits,
learning thresholds, current captures, expression asset prompt, and verification.


## Analytics and account cards

The fifth tab, Analytics, provides a local-date monthly spending calendar with
per-day purchases, category shares, payment-source filters, monthly/all-time
summaries, and purchase editing. Entries keeps the searchable/exportable list.
The header account circle edits profile, budget and branded wallet/card tiles.
Optional current amounts use a snapshot baseline so existing history is not
subtracted again; new wallet spending reduces balances and credit charges increase
amount owed. Amounts are estimates from local records, not bank connections.
Five loose ends can trigger an optional idle reminder with a 24-hour cooldown.
See `docs/research/analytics-wallets-2026-11-13/design-notes.md` for semantics,
asset sources, captures, and verification limits.

## Final motion and identity polish

Log rotates among eight matched greetings on new visits/returns, without changing
wording during entry. Setup’s working pose stays centered three seconds longer.
Account entry/exit and Settings disclosures use shared, reversible motion, with
focus restoration and reduced-motion bypasses. A new close-up detective supplies
browser, Apple and manifest icons. The browser title is W’D GO — Lazy Expenses.
See `docs/research/final-polish-2026-11-13/design-notes.md` for asset prompt,
rendered sizes, captures and verification.

## GitHub Pages deployment

Production: https://crstntaro.github.io/WD_GO_LazyExpenses/
Source: https://github.com/crstntaro/WD_GO_LazyExpenses

Pushing `main` runs `.github/workflows/pages.yml`: clean npm install, lint, unit
checks, static export, then GitHub Pages deployment. Pages uses GitHub Actions as
its publishing source. There is no server or database; each visitor's records
remain in that browser's local storage. Data on localhost or another domain does
not automatically move to this URL; use the existing JSON backup/import tools.

`npm run build:pages` exports to `out/` with the repository prefix. Run
`npm run preview:pages` to test it at http://127.0.0.1:3200/WD_GO_LazyExpenses/.
`NEXT_PUBLIC_BASE_PATH` can override the prefix (empty for root-domain hosting).
Normal `npm run dev` remains at http://localhost:3000/ without the prefix.

Public images, CSS sprite URLs, icon metadata, manifest scope/start URL, and the
service-worker cache all use the same prefix. Metadata icon GET routes are
prerendered; explicit icon metadata avoids root-only links in a subpath export.
Cache Components is disabled so those static routes work in local and export
builds. The static host does not require the development server's custom headers.
