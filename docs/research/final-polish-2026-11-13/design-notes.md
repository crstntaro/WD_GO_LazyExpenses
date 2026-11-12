# Final polish: copy, transitions, and app identity

13 November 2026. Local implementation, no deployment or data migration.

## Setup handoff

The working detective remains centered for three additional seconds. With default
tokens the complete handoff is about 5.5 seconds. Fade-in remains short and the
flight remains about one second; only the centered working section is extended.
Caption stays readable until travel starts. Completion is still saved before
animation, returning users skip it, and reduced motion bypasses the sequence.

## Log copy

Eight matched greeting/headline pairs retain the same purchase-logging context.
Selection occurs once when the tracker mounts and when returning to Log from a
different tab, with no immediate repeat. A name is included when present;
anonymous wording is complete without a placeholder. Typing, saving, preference
changes and repeat taps on the already-selected Log tab do not shuffle the text.
Drafts survive navigation. No timer or additional persistent personal data is used.

Every variant was checked at 320 × 740: Save remained above the dock, with no
horizontal overflow. The name and headline remain ordinary text and a real h1.

## Surface transitions

Account opens with a 360ms fade/scale/rise and closes over 220ms, keeping the
native modal and backdrop present until the exit finishes. Escape follows the
same close path. Repeated close requests do not stack animations. Focus returns
to its opener after removal, including touch Safari. The header button explicitly
focuses itself before opening so pointer-focus differences do not lose the return
target. Profile, budget and source drafts retain their existing save behavior.

Tab content now enters with a 14px rise over 400ms while the existing glass dock
selection moves. Settings disclosures animate their measured height in both
directions and reverse from their current height when pressed again. They remain
native details/summary controls, including keyboard activation. Settled heights
return to auto so resized content can grow naturally.

Imperative animations read shared duration/easing tokens through lib/motion.ts.
App/system reduced motion bypasses the movement. Theme switching retains its
separate coordinated palette reveal; text/background colors are not cross-faded.

## Icon and naming

Browser title and manifest name: W’D GO — Lazy Expenses.
Installed short name and Apple title: W’D GO.
The visible product wordmark is retained.

A new close-up detective portrait is used by browser and app icons. Source:
public/brand/detective-icon.png, 1254 × 1254 RGBA with genuine transparency.
Mode: built-in ImageGen edit using public/brand/paper-detective.png as reference.
No existing character pose was overwritten.

Exact generation prompt:

> Use case: character consistency. Asset type: favicon and home-screen app icon mascot cutout. Edit the attached paper detective into a new compact front-facing HEAD-AND-SHOULDERS app-icon portrait, not the full-body pose. Exact same friendly lime receipt-paper detective identity with cream folded upper-right paper corner, navy fedora, iris hatband, big expressive ivory eyes, confident small smile and a coral circular magnifying glass over one eye. Make the other eye playfully slightly squint, alert and friendly. Simplify details for instant recognition at 32 pixels: bold clean thick ink #121B22 outlines, generous solid shapes, minimal shading, NO thin receipt lines, no hands or legs, no small decorative props, no lettering. The portrait is centered upright, almost fills a square with even 8 percent transparent margins, all hat and face edges inside frame. Hat and face should form a compact rounded silhouette, no long extensions. Palette strictly ink #121B22, lime #E6F4C0, cream #F8F3E9, iris #A7B4F3, coral #FF805F. Preserve established cartoon style, no 3D, no photographic effects, no background, no shadow, no watermark. Genuine transparent PNG. Single icon portrait only, not a grid or mockup.

The existing ImageResponse icon helper renders this artwork on the ink background
at 512, 192 and 180px. Additional numbered icon routes render 32 and 48px browser
icons; favicon.ico contains those two PNG sizes. Manifest identity/start URL stay
unchanged. The production shell precaches the new icon source, favicon and routes.
No provider or image-generation request occurs while users use the app.

## Evidence

- [Varied Log at 320px](log-mobile.png)
- [Account at 320px](account-mobile.png)
- [Expanded Settings](settings-mobile.png)
- [App icon](app-icon.png)
- [Browser icon at 32px](browser-icon.png)

Lint, TypeScript, production build and 60 unit tests pass. Browser verification
covers 68 distinct Chromium/WebKit scenarios, with affected account and disclosure
cases rerun after final fixes. Coverage includes stable/randomized copy, drafts,
native Escape/focus/closure, rapid disclosure reversal, reduced motion, declared
PNG sizes/favicon/metadata, expense workflows, onboarding, saved balances, theme
switching, imports/exports and offline saving. Development CSS and title were
checked from actual served responses. Images and rendered icon sizes were
visually inspected with temporary isolated data. No physical-device installation
or software-keyboard claim is made.

