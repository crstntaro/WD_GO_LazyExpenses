# Progressive local logging

13 November 2026. Implemented locally; no server, deployment, or data migration.

## Daily flow

Log opens with a peso amount and Save expense. A name is optional and collapsed;
adding an unknown amount still saves it for Catch-Up. Use words accepts a short
remembered purchase such as `paid 95 for monster yesterday via GCash`, with a
visible name/date/source preview. The source named in the note takes priority over
the default source. Catch-up and frequent shortcuts remain one action away.
Compact-height phones use tighter spacing so the default Save clears the dock.

The parser supports amount-first/name-first notes, pesos/PHP, grouped amounts,
k shorthand, today/yesterday and ngayon/kahapon, common English/Taglish purchase
prefixes, and trailing from/via/using an exact saved active payment-source name.
It rejects multiple purchase amounts and unsupported future/relative dates rather
than guessing totals. This is a bounded local parser, not a general language model.

## Learning and corrections

Only named manual purchases and explicitly confirmed/corrected records teach the
engine. Unanswered suggestions, unnamed expenses, future records, and history over
90 days old are excluded. The latest 50 eligible examples for each exact amount
provide the evidence. A 70% same-name majority can suggest after one named example;
it remains an editable suggestion. A source-specific pattern needs two examples
and 75% agreement. If the amount remains ambiguous, time-of-day within two hours
requires three examples and 80% agreement (with at least four overall examples).
Backdated and batch logging does not use the current time to guess an old purchase.

Recent explicit category corrections take priority for the same normalized name.
Filipino food, transport, household and other category vocabulary is expanded.
Grouping shortcut evidence avoids rescanning the full history for each amount.

Newly logged and edited expense names capitalize their first Unicode letter.
Existing names are capitalized for display/export; raw legacy records and extra
backup fields are preserved. User history never leaves browser storage.

## Appearance and companion

Iris is the default when no explicit accent is stored. Old Coral/Lime choices
remain intact. The actual hue/saturation wheel supports pointer dragging, keyboard
arrows (Shift for larger steps), a strength slider, hex input, and Reset to Iris.
Preview updates immediately; persistence is briefly debounced and flushed when
leaving. Custom colors receive readable foreground colors for light/dark palettes.
The same token calculation runs before hydration to prevent a saved-color flash.

The waiting detective has separate open, blink, wink, and startled faces. Poking
by touch, mouse, or keyboard restarts one short reaction and never submits the
form. Idle movement pauses in background tabs. Reduced motion removes autonomous
movement while retaining deliberate expression feedback. Inspection, save salute,
and the setup arrival handoff remain in place without a second header mascot.

## Asset provenance

Mode: built-in ImageGen edit, with `public/brand/detective-waiting.png` as reference.
Output: `public/brand/detective-expressions.png` (1254 × 1254 RGBA, 2 × 2 frames).
The transparent asset is included in the offline shell cache.

Exact prompt:

> Create a perfectly REGISTERED 2 by 2 sprite sheet, square canvas, four equal square cells, of this EXACT waiting paper detective mascot for a finance app. The provided image is the exact edit/identity/composition reference. Preserve its navy hat, iris band, lime receipt-paper face, cream folded corner, coral magnifying glass, gloved hand supporting cheek and gloved hand holding glass. In EVERY cell keep the identical leaning pose, identical silhouette, identical head/hat/body scale, same camera, same flat bottom hand baseline, same transparent margins. Character should occupy about 85 percent of each cell, centered horizontally; do not clip hat or hands. Change ONLY facial expression: top-left normal open eyes looking down with warm smile (reference), top-right both eyes gently fully CLOSED in a natural blink with same smile, bottom-left a playful one-eye WINK and slightly cheeky smile, bottom-right surprised after a gentle POKE: both eyes wide, eyebrows raised, small round O mouth, friendly not frightened. These are four animation frames of ONE character, not different drawings or sizes. No cell borders, no numbers, no text, no new props, no platform, no shadows outside the character. Genuine transparent PNG background. Crisp same thick ink outlines and subtle shading as reference. All four faces must align exactly so changing frames makes eyes blink while the character stays in place.

## Verification and captures

Lint, TypeScript, production build, and 56 unit tests pass. All 50 distinct browser
scenarios pass across desktop Chromium and iPhone-sized WebKit, including the
remaining compact-mascot assertion rerun after updating its intended 140px size.
Coverage includes local persistence, offline saving, onboarding/handoff, no duplicate
edits, source filtering, batch/import/export, theme reversals, reduced motion,
wheel pointer/keyboard/hex/reload, actual face-frame changes, repeated pokes, and
natural-note date/source recognition. Isolated temporary profiles were used.
No physical phone/soft-keyboard or installed home-screen claim is made.

Visually inspected captures:

- [393px Log](log-393-dark.png)
- [390 × 664 compact Log](log-short-phone.png)
- [Remembered note](remembered-note.png)
- [Learned 95 on desktop](learned-95-desktop.png)
- [Light appearance wheel](color-wheel-light.png)
