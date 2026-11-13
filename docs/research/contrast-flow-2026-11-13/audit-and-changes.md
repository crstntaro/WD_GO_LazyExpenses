# Contrast and task hierarchy

13 November 2026. Existing app, same mascot and brand; local-first behavior retained.

## Scope and evidence

Fresh captures cover logging a purchase, finding a saved entry, understanding
category spending, organizing missing details, and changing preferences. Captures
use isolated temporary Alex/GCash/Cash records at 393 × 852 in both themes, plus
desktop and compact-phone checks. The Log greeting may rotate between captures.
This is a screen/interaction audit, not a usability study with the friend or a
claim of complete accessibility conformance.

## Findings and changes

1. **Log — clearer primary task.** Before, the amount had no visible field boundary
   and its faded placeholder resembled disabled text. Paid from resembled a label
   until hover/focus. Now a recessed, outlined amount well, readable placeholder,
   and framed source selector lead into the solid primary Save button. The form
   gets an Iris edge and stronger separation from the canvas. New users no longer
   see empty monthly/history blocks competing with their first purchase.
   [Before](before-dark-Log.png) · [After](after-dark-Log.png) ·
   [Light](after-light-Log.png)
2. **Entries — clearer retrieval and review.** Before, similar dark panels and a
   low-contrast selected period made the screen hard to scan. Now Your entries
   identifies the list's role, the selected period is explicit, search has a visible
   boundary, and Calendar & category breakdowns links directly to Analytics.
   Expense amounts are warm; missing details have both a warm edge and their
   existing text status. Category dots preserve names and custom categories.
   [Before](before-dark-Entries.png) · [After](after-dark-Entries.png)
3. **Analytics — clearer grouping.** Before, every chart bar was Iris, weakening
   recognition across categories. Now category dots/bars use consistent semantic
   colors shared with the record list, while labels, amounts and percentages remain.
   Calendar days with spending have a persistent tint; selected/today states stay
   explicit. The heading is Spending overview, separate from the Entries list.
   [Before calendar](before-dark-Analytics.png) · [After](after-dark-Analytics.png) ·
   [Before categories](before-dark-categories.png) · [After](after-dark-categories.png)
4. **Catch-Up — one obvious next action.** Before, Add a name and Add a missed
   expense had similar primary emphasis. Now Organize expenses names the job,
   the active review card has a warm boundary, and the review action stays primary.
   Adding another purchase is outlined and secondary. Loose-end counts use plain
   expense/detail wording. Saved entries, confirmations and edits are unchanged.
   [Before](before-dark-Catch-Up.png) · [After](after-dark-Catch-Up.png)
5. **Settings/navigation — visible current location.** Before, the selected dock
   blended with neighboring glass cells and disclosure boundaries were faint.
   Now the active pill has an accent outline/tint and heavier label, while stronger
   settings/control edges show click targets before hover. Account has a persistent
   accent treatment. Labels retain readable foregrounds as the pill slides; filled
   Iris with fading label colors was rejected because it introduced low-contrast
   intermediate frames. Theme changes still reveal whole palettes together.
   [Before](before-dark-Settings.png) · [After](after-dark-Settings.png)

The tab reset now happens after the panel DOM updates, with scroll anchoring
excluded from the changing body. This fixes arriving partway down a new screen
when switching from a long scrolled section. Keyboard roles, tab order, focus
behavior, reduced motion, glass/solid options and custom accents are retained.

## Color roles

- Iris/custom accent: primary action, current location and selected filters.
- Coral/warm accent: recorded outflows and details needing review.
- Lime/green accent: shortcuts and monthly spending context.
- Neutral surface/field/edge tokens: grouping and interactive boundaries.
- Category colors: consistent data identification, always paired with text.

Custom accent foregrounds are computed against elevated neutral surfaces rather
than only the page background. The color wheel's chosen action color stays intact.
Strong field/button outlines preserve boundaries even with black/white choices.
Dark stays dark; light retains paper and cream surfaces. No new illustration,
dependency, tracking service, financial model or storage key was introduced.

## Verification

[W3C's text guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
uses 4.5:1 for ordinary text, with exceptions for large text. Its
[control contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
uses 3:1 for necessary visual information identifying controls/states. The checks
here measure the unfocused field/source/mode boundaries at >=3:1 and placeholder /
selected navigation text at >=4.5:1 in both themes. They also exercise extreme
black/white accents, category consistency, scroll reset and simplified empty state.
They do not establish complete WCAG conformance.

Lint, TypeScript, production build, static Pages export, and 61 unit tests pass.
The full browser run covered 78 Chromium/WebKit scenarios; affected contrast,
custom-color, empty-state, Catch-Up and motion cases were rerun after fixes (18/18
passed). Existing onboarding, learning, expense editing, source balances, Analytics,
backup/import/export, theme reversal, mascot and offline scenarios also passed.
All eight greeting variants keep Save clear of the dock at 320 × 740 and 390 × 664.
The actual development stylesheet was fetched to verify the new styles are served.

[320px](after-compact-320.png) · [Short phone](after-compact-390.png) ·
[Desktop](after-desktop.png) · [Light category summary](after-light-categories.png)

Physical phone keyboard/install behavior and screen-reader output remain outside
this run. The visible changes are design hypotheses intended to make the first
action and current location easier to recognize; feedback from real users remains
useful after deployment.

## Live cold-connection follow-up

The first public smoke test exposed an independent flow delay: the setup overlay
waited for the 1,120,606-byte cooking PNG to decode before revealing the caption or
starting its animation. One live asset probe took about eight seconds; the browser
also waited for download/decode. The tracker itself was already saved.

A transparent 420px WebP delivery rendition is now 38,938 bytes (about 96.5% smaller),
with the original PNG preserved. Setup preloads that small rendition while answers
are entered. The status caption stays readable during a wait, and a 2.5-second
image-ready bound skips the decorative handoff if delivery fails/stalls. Healthy
connections retain the full requested animation timing. This changes no financial
processing, setup completion or saved records.

Six focused Chromium/WebKit checks passed for the normal handoff, a deliberately
stalled illustration, and offline saving. The added stalled-image cases bring
coverage to 80 distinct browser scenarios across this iteration and its follow-up.
