# Post-setup “let him cook” handoff

13 November 2026. Focused local UI change.

The detective has a new working pose only after the fourth setup answer is
submitted: magnifying glass in one hand, pencil and receipts in the other. A
short rocking motion holds the pose before the existing measured flight into the
Log companion slot. The full handoff lasts about 2.5 seconds with default motion
tokens. The caption is “Putting your trail together…”. Completion is still saved
before animation; return visits skip the handoff, decode/API failures fall through
to the tracker, and reduced motion bypasses travel. No financial processing or
network operation is implied by the animation.

Every tab activation now restarts the wordmark reaction, including repeat taps,
keyboard changes, and links that change the active tab. It remains event-driven.
The mark grows to 1.5×, hops 12px and settles over 850ms. Changing its transform
origin keeps the larger mark inside the viewport. Each activation remounts one
animated mark, so rapid presses replace its current motion instead of queuing.
App/system reduced motion suppresses movement.

## New image

Built-in ImageGen edit using public/brand/paper-detective.png as identity reference.
Project asset: public/brand/detective-cooking.png (1254 × 1254, real alpha).
It is precached in the production offline shell. Original identity assets remain.

Exact prompt:

> Use case: character consistency. Asset type: transparent finance-app loading mascot. Edit the attached original paper detective into one new 'let him cook' / locked-in, getting-things-done pose, slang sense rather than literally cooking food. Keep EXACT character identity, lime receipt-paper body with cream folded corner and ink receipt lines, navy fedora with iris hatband, coral magnifying glass, ivory gloves, black ink outlines, rounded eyes, charming editorial cartoon shading. Show him leaning forward over a small tidy stack of cream receipts, eagerly scribbling with a coral pencil in one gloved hand while using the magnifying glass in the other, a focused confident grin and raised eyebrow. A few small iris/lime action sparkles around his working hands imply he is putting the user's money trail together. Three-quarter front view, full character including hat and feet, large and centered in a square composition with generous transparent margins. Receipts are a small prop, not a desk or full scene. No chef hat, no food, no kitchen, no text, no watermark, no background or ground shadow. Crisp clean illustration, same brand palette. Output genuine transparent PNG.

## Verification

Lint, TypeScript, production build, and 59 unit tests pass. Six focused browser
scenarios cover the setup handoff, repeat/all-tab/keyboard bounces, visible peak
bounds, reduced motion and offline reopening across Chromium desktop and
iPhone-sized WebKit. New asset decode and both browser captures were checked.
Development CSS was inspected directly from the served stylesheet.

- [Setup on phone](setup-mobile.png)
- [Setup on desktop](setup-desktop.png)
- [Bounce on phone](bounce-mobile.png)
- [Bounce on desktop](bounce-desktop.png)

All captures use isolated temporary data. No physical-device testing is claimed.

