# Mobile portrait refactor audit

Status: `[x]` fixed, `[~]` intentionally retained or verified another way.

## Landscape assumptions and fixed sizing

- [x] Replaced the 1280×720 renderer/stage assumptions with a 720-wide, 1080–1680-high `LayoutManager`, centered 720×1280 safe frame, CSS safe-area probe, `visualViewport`/orientation resize pipeline, and a 480 CSS px desktop column.
- [x] Moved scene/UI regions and dimensions to `src/data/layout.ts`; palette, type, spacing, touch sizes, placeholder settings and animation values live in `src/data/theme.ts`.
- [x] Replaced landscape scene coordinates in Greenhouse, Packing, Farm Tools and Counter. The 5×4 grid now uses `gridFit` plus data-adjustable `GreenhouseDef.slotLayout`.
- [x] Updated background asset suggestions and documentation from 1280×720 to 720×1600 with a central 720×1280 art-safe area.

## Input and touch

- [x] Replaced hover/`pointertap` behavior with pointer down/move/up/cancel gestures, press feedback, drag cancellation, explicit hit areas and 88×88 minimum controls. No game feature requires hover, right click or keyboard.
- [x] `ScrollList` supports touch drag, inertia, clipping, scrollbar and desktop wheel. `BottomSheet` supports backdrop close and swipe-down close.
- [x] Inventory, quests/rank and seed selection are touch sheets; pot selection uses a persistent context panel. Counter rejection now confirms Favor loss.
- [x] Browser selection, context menu, overscroll, touch callout, pinch/double-tap gestures and page scrolling are suppressed. Safe insets keep controls outside notches and home indicators.

## Visual and performance risks

- [x] Body text is at least 28 logical units. Placeholders use the shared theme and cached resolution-2 textures; Vietnamese uses a system font stack.
- [x] HUD and plant/order countdown text are guarded or refreshed at 1 Hz. Scroll/sheet animations reuse display objects; scene and list children are destroyed on replacement.
- [x] The ticker pauses and saves while hidden; `pagehide` saves for mobile Safari; returning recomputes timestamp-based state before resuming.
- [x] Added a code-drawn loading state, phone-accessible debug sheet, 5-tap HUD gesture, and safe-region/tap-target overlay.

## Verification

- [x] Pure layout, grid fitting, safe inset and tap/drag math have Vitest coverage.
- [~] Browser automation is used for live viewport/console/layout checks. Persistent screenshots are not generated because this project explicitly forbids creating image files.
