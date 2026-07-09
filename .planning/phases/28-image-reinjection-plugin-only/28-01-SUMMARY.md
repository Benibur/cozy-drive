---
phase: 28-image-reinjection-plugin-only
plan: 01
subsystem: ui
tags: [onlyoffice, plugin, es5, image, FromJSON, AddDrawing, getLocalImagePath, callCommand]

# Dependency graph
requires:
  - phase: 27 (scribe-in-right-panel base, incl. fix L#2 + dev cache fix)
    provides: single-callCommand injection with end-of-callCommand post-selection (fix L#2)
provides:
  - Plugin-only image re-injection during Replace via Api.FromJSON + AddDrawing
  - Read-only full-ToJSON capture pre-pass + async getLocalImagePath media registration (ES5 counter barrier)
  - Shared cell+paragraph image path (no marker/PasteHtml split)
  - Dormant floating-image fallback hook (drawingType === "anchor" + FLOATING_FALLBACK=false)
  - Removal of the GroupActions undo-group stub (no replacement grouping)
affects: [28-02 (live UAT + save round-trip verification), image-replace-chantier, selection-cases-harness goldens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Media pre-pass: capture full ToJSON (read-only callCommand) → getLocalImagePath (async, ES5 counter barrier) → single injection callCommand"
    - "Blip rewrite: j.graphic.blipFill.rasterImageId = ret.path before a fresh Api.FromJSON per insertion"
    - "One callCommand = one history point = one undo (no GroupActions stub)"

key-files:
  created: []
  modified:
    - plugins/onlyoffice-scribe/scripts/code.js

key-decisions:
  - "Capture the full drawing ToJSON in a dedicated read-only pre-pass callCommand (fresh, runs before InsertContent destroys the source drawings) rather than at extraction time"
  - "Use ret.path (\"media/imageN.png\") as the blip rewrite value (spike-verified); ret.url is the documented Plan-02 fallback — SUPERSEDED by 28-02: switched to ret.url (prefix-stripped) because ret.path renders blank-until-reload (getFullImageSrc2 double-prefixes to undefined)"
  - "getLocalImagePath error:true records the image WITHOUT a localPath so injectDrawingInto skips it — never writes an empty rasterImageId (T-28-01 mitigation)"
  - "Added a safety barrier timeout (8s) so a dropped getLocalImagePath callback can never hang the injection (Rule 2 — critical robustness)"
  - "Floating fallback is a dormant hook only (FLOATING_FALLBACK=false, passed via Asc.scope); the PasteHtml fallback path is intentionally not built (28-RESEARCH Risk 1: floating preserved by construction)"

patterns-established:
  - "injectDrawingInto(target, name): shared FromJSON+AddDrawing insertion for paragraph, cell, code_block, and top-level image sites"
  - "collectReferencedImageNames(flat, parsedTables): plugin-side scan feeding the capture pre-pass"

requirements-completed: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-05]

# Metrics
duration: ~35min
completed: 2026-07-06
---

# Phase 28 Plan 01: Plugin-only image re-injection at Replace Summary

**Replace-path image re-injection rebuilt entirely inside the single injection callCommand: full-ToJSON capture → async getLocalImagePath media registration (ES5 counter barrier) → blip rewrite → Api.FromJSON + AddDrawing for cell AND paragraph, replacing the marker+PasteHtml machinery and deleting the GroupActions undo-group stub. Zero sdkjs modification.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-06
- **Tasks:** 3
- **Files modified:** 1 (`plugins/onlyoffice-scribe/scripts/code.js`; net 250 insertions / 261 deletions)

## Accomplishments
- Read-only capture pre-pass callCommand serializes each referenced image's full drawing `ToJSON` + blip data-URL BEFORE `InsertContent` destroys the source drawings.
- Async `getLocalImagePath` media registration per image, joined by an ES5 counter barrier (plain `var remaining` + `oneDone()`); the injection callCommand starts only once every registration returns. Includes an 8s safety timeout to prevent hangs.
- All image consumption sites (`addRunsToParagraph`, `addBlockToParagraph`, `code_block`, top-level `image_placeholder`) route through one shared `injectDrawingInto()` helper: blip `rasterImageId` rewritten to the registered `ret.path`, then a fresh `Api.FromJSON` + `AddDrawing` per insertion — for cell AND paragraph.
- Marker/`injectPendingImages`/per-image PasteHtml machinery, `imageSpecFor`/`addImageMarker`/`pendingImages`, and the `drawingIndex`/`imageCache`/`Copy()` pre-cache removed from the injection callCommand; callback simplified to `pasteInProgress = false`.
- GroupActions undo-group stub (`startUndoGroup`/`endUndoGroup`, `undoGroupOpen`) and all call sites removed; no replacement grouping added (single callCommand is already one atomic undo point).
- Dormant floating-image detection hook (`drawingType === "anchor"`) gated by a `FLOATING_FALLBACK=false` module flag passed via `Asc.scope`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture full drawing ToJSON + async getLocalImagePath media pre-pass** - `180bc2fb7` (feat)
2. **Task 2: Swap injection to Api.FromJSON + AddDrawing; remove marker/PasteHtml machinery; floating hook** - `1f29cad6e` (feat)
3. **Task 3: Neutralize the GroupActions undo-group stub** - `db6825ccb` (refactor)

_Note: Tasks 1 & 2 are flagged `tdd="true"` in the plan, but behavioral tests are live-only (Plan 28-02) and the jest harness is broken in this worktree (per MEMORY). The plan's own verification section designates the structural `node --check` + grep gates as the automated gate for this plan — see TDD Gate Compliance below._

## Files Created/Modified
- `plugins/onlyoffice-scribe/scripts/code.js` — Replace-path image re-injection refactor (plugin-only, ES5-strict). Final line anchors:
  - `collectReferencedImageNames(...)` — plugin-side helper (before `buildAndInject`)
  - `injectDrawingInto(target, name)` — **line 981**; blip rewrite `j.graphic.blipFill.rasterImageId = entry.localPath` at **line 999**; fresh `Api.FromJSON(JSON.stringify(j))` at **line 1006**
  - FromJSON+AddDrawing sites: `addBlockToParagraph` (cell block) **line 1128**; `addRunsToParagraph` (inline) **line 1397**; `code_block` **line 1655**; top-level `image_placeholder` **line 1732**
  - Read-only capture callCommand — **line 2313** (`imageSpecFor` returning `{name, json, dataUrl}` inside it)
  - Async barrier: `var remaining = captured.length` **line 2393**, `oneDone()` **line 2405**, `executeMethod("getLocalImagePath", [cap.dataUrl], ...)` **line 2415**, `ret.path` rewrite **line 2417**
  - `FLOATING_FALLBACK` module flag near `pasteInProgress` (~line 118); `Asc.scope.floatingFallback` set in the injection setup

## Decisions Made
- **`ret.path` used for the blip rewrite value** (spike-verified per 28-CONTEXT/28-RESEARCH A4). `ret.url` is the one-line Plan-02 fallback if a live check shows a blank/dropped image. **⚠️ SUPERSEDED by 28-02 (commit `18e0fb0f5`):** the live check showed exactly that blank-until-reload symptom with `ret.path` (getFullImageSrc2 re-adds the `media/` prefix → undefined), so the blip value was switched to **`ret.url`** (prefix-stripped). Post-inject render-cache warming (LoadImagesWithCallback + CheckRasterImageOnScreen) was also added. Additionally the extraction `SetName` rename is now wrapped in `History.TurnOff/On` so an image Insert is a single undo (commit `d2b8782be`).
- **Dedicated read-only capture pre-pass** (not capture-at-extraction) so the serialized ToJSON is fresh and handles images edited since extraction (28-RESEARCH ordering constraint 2).
- **Fresh `Api.FromJSON` per insertion** (Pitfall 2) — `injectDrawingInto` never reuses one ApiDrawing across two `AddDrawing` calls.
- **Floating fallback left dormant** — source analysis (28-RESEARCH Risk 1) shows anchor/wrap is preserved through FromJSON+AddDrawing; the hook exists but the PasteHtml fallback is intentionally unbuilt pending Plan-02 Q1 live confirmation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added an 8s safety timeout on the getLocalImagePath counter barrier**
- **Found during:** Task 1 (async media pre-pass)
- **Issue:** The plan specifies a plain counter barrier over N `getLocalImagePath` callbacks. If one callback is ever dropped (never fires), the barrier would never reach 0 → `runInjection()` never runs and `pasteInProgress` stays `true` forever, wedging the plugin.
- **Fix:** Added a `barrierTimer` (`setTimeout`, 8000ms) with a `proceeded` guard so the injection proceeds with whatever media resolved, and the timer is cleared once the counter completes normally. Failed/late images are already skipped safely (no empty rasterImageId).
- **Files modified:** plugins/onlyoffice-scribe/scripts/code.js
- **Verification:** `node --check` passes; barrier still gates the injection on the normal path; ES5 preserved.
- **Committed in:** `180bc2fb7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical robustness guard)
**Impact on plan:** The timeout is a defensive correctness guard consistent with T-28-01's error-handling intent; no scope creep, no behavior change on the happy path.

## Issues Encountered
- The old `addImageMarker` and `addRunsToParagraph` footnote markers use literal NUL (` `) bytes, which the exact-string Edit tool cannot match. Resolved by deleting `addImageMarker` and `injectPendingImages` via line-range `sed` after confirming boundaries — no NUL-bearing lines were left orphaned.

## TDD Gate Compliance
Tasks 1 & 2 carry `tdd="true"`, but this plan is **structure-verified, not test-verified**, by design: the plan's `<verification>` section states behavioral verification (single undo, no flicker, selection coverage, fidelity at save, regression goldens) is **live-only and covered by Plan 28-02**, and the jest harness is broken in this worktree (per MEMORY). No RED `test(...)` commit was produced because a runnable behavioral test requires the OO editor runtime (`callCommand`, `Api.FromJSON`, `executeMethod("getLocalImagePath")`) which is unavailable here. The automated gate satisfied for every task: `node --check` (ES5 parse) + the grep gates from the plan's `<verify>`/`<acceptance_criteria>` blocks — all green.

## Ambiguous consumption sites (for Plan 02 live UAT)
- **`code_block` image branch** (line 1655): kept on the shared FromJSON path for parity, but an image inside a fenced code block is an unlikely LLM output — untested live.
- **Floating (anchor) images** (28-RESEARCH Q1): routed through the FromJSON fast path by default; `FLOATING_FALLBACK` hook is present but dormant. Needs the Plan-02 floating-save check to confirm the anchor/wrap survives a forcesave; if not, flip the flag and build the PasteHtml fallback.
- **Cross-origin real-Cozy `getLocalImagePath`** (28-RESEARCH Q3): async callback confirmed in source/oo-dev only; needs one live cross-origin confirmation.

## Next Phase Readiness
- Structural refactor complete and parsing as ES5; ready for Plan 28-02 live UAT (re-point oo-dev to this worktree, run Replace with cell + paragraph images, forcesave round-trip, re-run image goldens T9/C1 + Insert regression).
- No STATE.md/ROADMAP.md writes performed (worktree mode — orchestrator owns those).

## Self-Check: PASSED
- FOUND: plugins/onlyoffice-scribe/scripts/code.js
- FOUND: .planning/phases/28-image-reinjection-plugin-only/28-01-SUMMARY.md
- FOUND commits: 180bc2fb7, 1f29cad6e, db6825ccb, 9e90bc409
- `node --check` on code.js: ES5-PARSE-OK

---
*Phase: 28-image-reinjection-plugin-only*
*Completed: 2026-07-06*
