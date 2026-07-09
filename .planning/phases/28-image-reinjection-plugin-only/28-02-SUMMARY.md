---
phase: 28-image-reinjection-plugin-only
plan: 02
type: execute
wave: 2
status: complete
completed: 2026-07-09
requirements: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-05]
commits: [18e0fb0f5, d2b8782be, 037e465d7, ba54d6306]
build: 2026-07-09.6
---

# 28-02 — Live UAT + save round-trip — SUMMARY

Live verification of the plugin-only image re-injection landed by 28-01, driven via the dev **Test MD** panel (deterministic, no LLM) on a **fresh, un-contaminated** one-inline-image doc so the extraction rename actually fires. Harness: Chrome MCP, alice2/cozy, `localStorage.SCRIBE_DEV_MD='true'`; save flushed by navigating away from the editor (autosave/Ctrl+S do NOT flush to Cozy); saved `.docx` downloaded via the files API and unzipped to inspect `word/document.xml` + `word/media/`.

## Result per check

| Check | Requirement | Result | Evidence |
|-------|-------------|--------|----------|
| Single undo (Insert) | IMG-01 | ✅ PASS | Fresh doc: Annuler starts DISABLED → Test MD Insérer → one Ctrl+Z → Annuler DISABLED again (undo stack empty = single point). |
| Single undo (Replace) | IMG-01 | ✅ PASS | Same protocol on Replace = one undo. |
| Live render + size | IMG-02/04 | ✅ PASS | Injected image paints immediately at its stored (small) extent size, no reload. Console: `insert (Builder API)` → `warming render cache for 1 injected image(s)` → `Builder injection complete`. No bogus 50mm image. |
| Selection covers content | IMG-03 | ✅ PASS (inherited) | Post-injection sentinel-run selection (fix L#2) covers text+image; the empty-selection gate keeps a collapsed cursor from re-extracting. |
| **Save fidelity — image survives save** | **IMG-04** | ✅ **PASS (bug found + fixed)** | See below. |
| Paragraph-image parity | IMG-05 | ✅ PASS | Shared `injectDrawingInto`; the inline repro is a paragraph image. |
| Regression Insert | — | ✅ PASS | Insert path exercised throughout; single undo + save-embed hold. |
| Regression T9 (cell) / C1 (¶) | — | ⚪ inherited | C1 (¶-image Replace) exercised directly (PASS). T9 (table-cell) not re-run live this pass — orthogonal to the 28-02 changes (SetName history-off / blip=ret.url / recalculate=true) and validated in the earlier image-replace chantier (build .5). |

## IMG-04 save fidelity — the real finding of 28-02

The re-injected image **rendered live but was LOST at save** (blank on reopen). This was NOT visible in the 28-01 spike (which only checked one already-registered cell image at forcesave). Traced via `/gsd-debug` — full record in `.planning/debug/resolved/inject-blip-lost-at-save.md` and `.planning/debug/knowledge-base.md`.

- **Symptom:** saved `.docx` injected drawing = degenerate `<pic:blipFill dpi="7602275"><a:tile/></pic:blipFill>` (NO `<a:blip>`), no `word/media` part → blank on reopen. Original image in the same doc serialized fine.
- **Two falsified fixes (recorded so they are not retried):** `.3` "keep the ToJSON data-URL" and `.4` "resolve the bare media id to a fetchable http URL" BOTH failed the unzip oracle identically. A `.5-diag` instrumented build proved the source WAS a real `data:` URL, `getLocalImagePath` returned `error:false` with a byte-backed media id (server HELD the bytes), and a 10-15s durability wait was a no-op — so bytes-on-server and rasterId FORM were not the failure.
- **Root cause:** the injection callCommand ran with `recalculate=false`. Under `Asc.editor.evalCommand===true`, `CImageShape.setBlipFill` skips its `CChangesImageId*` history, so the blipFill/rasterImageId change is never transmitted to the co-editing (x2t) server and `CollaborativeEditing.Add_NewImage` never fires → x2t rebuilds the drawing with no raster → degenerate blipFill.
- **Fix (commit `ba54d6306`, build `2026-07-09.6`):** pass `recalculate=true` for the injection callCommand when images are present (`scribeInjectRecalc`, code.js:605 → used as the 3rd `callCommand` arg at code.js:2402). That runs `_afterEvalCommand → Reassign_ImageUrls` (now `evalCommand===false`) which re-applies `setBlipFill` WITH history → the change transmits, x2t writes `<a:blip r:embed>` + a new `word/media` part, and `Add_NewImage` fires. FromJSON geometry preserved (Reassign duplicates the blipFill via `createDuplicate` — keeps stretch/tile/`srcRect`=crop — and never touches `spPr.xfrm` extent/rotation). The `getLocalImagePath` media pre-pass is kept (server must HOLD the bytes for x2t to write them — necessary but not sufficient).
- **Verified live:** INSERT → injected `scribe-img-N` = `<a:blip r:embed="rId10">`, new `word/media/image2.png` (295689 bytes), reopen renders both images. REPLACE → `<a:blip r:embed="rId9">` (media deduped). Single-undo intact (recalculate=true adds no undo point — Reassign appends to the same history point). `node --check` OK; jest 1253 pass / 1 skip / 1 pre-existing unrelated `ScribeContainer.spec.jsx` fail; selection harness 32/32.

## Still open (follow-ups, not blocking IMG-04)

- **Q1 floating (anchor) image wrap at save** — not exercised; if it fails, flip the dormant `FLOATING_FALLBACK` (anchor→PasteHtml) per 28-RESEARCH Risk 1.
- **Q3 cross-origin real-Cozy `getLocalImagePath`** — verified on oo-dev only.
- **IMG-02 no-flicker** — one render pass observed, not measured as a formal check.
- **T9 table-cell Replace** — re-run live to close the regression matrix formally.

## Env note

The debug agent's oo-dev restart temporarily broke OO↔cozy saving (callback JWT/session); re-running the oo-dev container from this worktree restored it. See the resolved debug session for the harness details (flush-by-disconnect, download+unzip oracle).
