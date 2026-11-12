# Log detective animation

Asset: `public/brand/detective-inspecting.png` (1536 × 1024, transparent PNG).
Generated with built-in ImageGen using `public/brand/paper-detective.png` as the
character reference. The original source is preserved. The later glass refresh removes the header
mascot and gives Log waiting/thinking/saved poses; this sheet powers thinking.

Generation brief: create a registered 4-column by 2-row sprite sheet of the same
paper detective, preserving its lime paper body, navy hat, lavender band, coral
magnifying glass, cream gloves, thick outlines, and transparent background. Keep
scale and placement consistent within each 384 × 512 cell. In reading order show
neutral, slight left, full left, blink, right, up, down, and neutral. Change the
eye direction and magnifying-glass pose so the character appears to inspect its
surroundings. No text, scenery, cell borders, or extra characters.

`components/log-mascot.tsx` decodes the sheet before showing it. CSS selects whole
frames rather than sliding across adjacent cells. A fourteen-second cycle includes
a long neutral pause. Background tabs pause playback. Both reduced-motion controls
keep the original still visible; a failed download also leaves the still intact.
The service worker caches the sheet for offline visits.
