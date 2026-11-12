# Less logging, a better way back

This is a reference review of official product documentation, not a usability
study or a claim that these apps were visually audited.

## What informed this iteration

- [Actual's rules](https://actualbudget.org/docs/budgeting/rules/) learn payee and
  category behavior from corrections, while leaving the rules under user control.
  Applied here: transparent, device-local patterns with an off switch. A saved
  guess never teaches another guess unless the person explicitly confirms it.
- [Toshl's expense lists](https://toshl.com/blog/expense-and-income-lists-ios/)
  put viewing, editing, deleting, searching, and filtering close to the record.
  Applied here: tap an entry to correct it, preserve its ID, and keep deletion
  reversible. Search and category filtering live on the Entries tab.
- [YNAB's reconciliation guide](https://support.ynab.com/en_us/reconciling-accounts-a-guide-BJFE3fHys)
  makes account review a deliberate task using a bank balance and transactions.
  Applied here: Catch-Up is a distinct destination. It currently resolves missing
  details in recorded expenses and adds remembered purchases; account-balance
  reconciliation remains outside this iteration because live balances and transfers are not modeled.

## The app's own behavior

The Log tab accepts an amount on its own. A repeated amount may receive the name
and category from the person's own recent history. The entry saves immediately,
with an eight-second confirmation prompt by default. Yes explicitly confirms the
name; No opens the editor; doing nothing closes the prompt and leaves the saved
entry marked as a suggestion. Catch-Up keeps that distinction visible later.

A suggestion needs at least one matching named expense and at least a 70% share
of the last 50 eligible records at that amount within 90 days. Comparison uses
integer cents and normalized names. Future-dated records, unnamed expenses, and
unconfirmed guesses are excluded. No purchase is invented for an unfamiliar or
ambiguous amount: it is saved as an unlabeled expense instead.

Prompt timers pause during hover, keyboard focus, loss of window focus, and hidden
pages. Settings supports eight seconds, fifteen seconds, or keeping the prompt
open. This is a convenience prompt, not a time limit on editing or saving.

The app keeps four focused bottom tabs: Log, Entries, Catch-Up, and Settings. The
mascot, restrained receipt treatment, and one-off questioning wordmark motion
support these actions. At the user’s request, the Log mascot periodically inspects
left, right, up, and down with its magnifier, with a long neutral rest. Both system
and app reduced-motion controls show the original still image. Appearance,
learning, motion, and budget preferences remain local. Downloaded JSON includes
both records and preferences; a previewed merge-import path is now included.

## Validation boundaries

Unit tests exercise inference, ambiguous amounts, exclusion of guesses, correction
history, timer pauses, setup compatibility, dates, cents, and data preservation.
Isolated Playwright tests exercise Chromium desktop and mobile WebKit, including
320px layouts, editing, confirmation/expiry, settings, downloads, reloads, and
actual service-worker offline reopening. Phone installation and the behavior of a
physical on-screen keyboard still need real-device validation.

Existing amount-only records can display a candidate learned from named entries.
They are never silently renamed; Catch-Up confirms the same record in place.


The later daily-use refinement is documented in
[the Tarsi comparison and screenshot audit](research/tarsi-2026-11-12/analysis.md).
It adds periods and grouped totals, category/source drilldowns, batch Catch-Up,
custom categories, grouped Settings, CSV, and a non-destructive backup merge.
Local versions of existing IDs win during import. Backup profiles/preferences are
not applied. Record and source storage keys remain unchanged.
