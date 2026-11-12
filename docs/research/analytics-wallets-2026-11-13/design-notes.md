# Calendar analytics and local wallets

13 November 2026. Local-only implementation; existing saved data is retained.

## Flow

The glass dock now has Log, Entries, Analytics, Catch-Up, and Settings. Its sliding
selection and arrow/Home/End keyboard controls use five destinations. Analytics
owns the calendar and breakdowns; Entries retains search, date/category/source
filters, editing, and filtered CSV export. Its former breakdown disclosure is
replaced with a direct Calendar & category breakdowns action.

Analytics opens on the current month with today selected. Daily totals, spending
dots, today/selected-day states, previous/next month, and Show month provide a quick
way to find purchases. Future days are disabled. Calendar amounts use local dates,
not UTC date slices; whole-peso/k summaries are only compact display labels and
full exact values remain in accessible day labels and the selected-day subtotal.
Arrow keys move focus by day/week. Only one day is in the Tab sequence.

A payment-source filter applies to the calendar and summary. Category rows show
amount and share, then drill into the calendar without removing the other category
rows. Category filtering has an explicit clear action. Summary period offers the
viewed month or all recorded history. The month summary includes a daily average
through today for the current month and over the full calendar for prior months.
Future transactions are excluded from Analytics. Selecting a purchase opens the
existing editor; editing preserves its original ID.

## Account area and amounts

The header edition badge is removed. The circular person button opens a native
modal dialog with name, optional monthly budget, and wallet/card management. The
heading and Close stay visible while scrolling. Profile editing in Settings links
to the same dialog, avoiding a stale duplicate profile form.

Cards display their provider, nickname, type, and recorded balance/amount owed.
GCash, Maya, BPI, BDO and Metrobank have local logo assets; other providers use a
generic card icon. Existing names are recognized, and a provider dropdown can
explicitly identify a custom nickname. Users can add, archive/restore, choose a
default source, rename, and set/clear current amounts. Bank/debit and credit-card
choices are labeled separately. No credentials, card numbers or bank connections
are collected.

An optional balanceCents and balanceRecordedCents snapshot lives on the existing
local account record. Setting an amount records the currently assigned expense
sum as the baseline. Later changes to that sum adjust the estimate: wallet/bank/cash
spending subtracts; credit charges add to amount owed. Reconciliation resets the
baseline without modifying any purchase. Edits, deletion, undo and source changes
therefore flow through without maintaining a second transaction ledger. Historical
spending is not deducted again when the user first enters a current amount.
Unset accounts show Set an amount. Blank edits remove tracking; zero is valid.
These figures reflect local records, including imported/reassigned expenses, and
are not bank-synced. Incoming funds, transfers, card limits and repayment ledgers
remain outside this scope; users can update a current amount directly.

Balance/provider metadata is optional and validated; legacy accounts remain valid.
Existing import collision rules retain local account metadata. Newly imported
sources retain their supplied snapshot metadata. Raw backups include these fields.

## Character and reminders

The existing waiting face/body cycle is now seven seconds rather than twelve,
with natural short blinks roughly twice per cycle and a wink. Poke, inspection and
save reactions remain; background pause and both reduced-motion preferences remain.
No additional character is placed in the data-heavy calendar or wallet dialog.

Five or more expenses needing names/review trigger an optional Organize expenses /
Later dialog after four idle seconds in Log. It waits while input, another dialog,
a suggestion, or a draft is active, and avoids opening in a background tab. Showing
it stores a local timestamp for a 24-hour cooldown, with an in-memory one-per-visit
cap. Both actions keep every expense saved. Organize opens Catch-Up.

## References and assets

[Tarsi’s App Store listing](https://apps.apple.com/tr/app/tarsi-budget-tracker/id6760278399)
describes its calendar and account handling. We adopted calendar-based retrieval
and visible account identities while retaining this app’s amount-first local flow.
This is reference research, not a hands-on audit of Tarsi.

Logo files are copied locally, not requested from providers as users log expenses:

- GCash: [official site](https://www.gcash.com), [source SVG](https://cdn.prod.website-files.com/6385b55675a0bd614777a5c1/6474928322d48888f6c8cfe5_biz-gcash-logo.svg).
- Maya: [official brand page](https://www.maya.ph/maya-updates), [source SVG](https://www.maya.ph/hubfs/Maya/MAYA-Mint%20Green.svg).
- BPI: [official site SVG](https://www.bpi.com.ph/content/dam/bpi/main-navigation/Logo_BPI.svg).
- Metrobank: [official site asset](https://web-assets.metrobank.com.ph/1753963478-logo_redesign-2025-2x.png).
- BDO Unibank: [Commons source and attribution](https://commons.wikimedia.org/wiki/File:BDO_Unibank_(logo).svg), identifying Banco de Oro as author/source and marking the simple logo public domain. The official website presented a challenge page.

Assets live in public/brand/providers and are precached by the production service
worker. Provider marks identify the user’s manually recorded source; no affiliation
or live connection is implied. No new AI-generated character artwork was needed.

## Visual checks

- [Phone calendar](analytics-mobile-dark.png)
- [Phone category summary](breakdown-mobile-dark.png)
- [Phone wallet cards](wallets-mobile-dark.png)
- [Desktop calendar](analytics-desktop.png)

Captures use isolated temporary data. Desktop and phone layouts were visually
inspected; browser coverage includes 320px, keyboard controls, theme toggles,
profile/budget persistence, source logos, balance baselines, credit charges,
calendar totals/filter/edit, and reminder navigation/cooldown. Physical phone
installation and soft-keyboard behavior are not claimed.

Final checks: lint, TypeScript and production build pass; 59 unit tests and all
58 Chromium/WebKit browser scenarios pass. Additional light-mode captures at
320px show no page or dialog horizontal overflow:
[calendar](analytics-320-light.png), [wallets](wallets-320-light.png).
