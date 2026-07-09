# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## inject-blip-lost-at-save — Re-injected image renders live but is lost at save (degenerate blipFill, no `<a:blip>`)
- **Date:** 2026-07-09
- **Error patterns:** injected image, blipFill, no a:blip, degenerate pic:blipFill dpi=7602275 a:tile, blank on reopen, save fidelity, word/media missing, rasterImageId, FromJSON AddDrawing, recalculate, callCommand, co-editing x2t save
- **Root cause:** The injection callCommand passed `recalculate=false`, so OO skipped `_afterEvalCommand → Reassign_ImageUrls` (apiBase.js:4638). During the callCommand `Asc.editor.evalCommand===true`, so `CImageShape.setBlipFill` (common/Drawings/Format/Image.js:117) SKIPPED its `CChangesImageIdStart`/rasterChunks/`CChangesImageIdEnd` history — so the blipFill/rasterImageId change was never transmitted to the co-editing (x2t) server and `CollaborativeEditing.Add_NewImage` (DrawingsChanges.js:391) never fired. The server reconstructed the drawing without a raster → x2t emitted a degenerate `<pic:blipFill dpi="7602275"><a:tile/></pic:blipFill>` (no `<a:blip>`, no word/media part). The rasterId FORM (data-URL vs byte-backed media-id) was IRRELEVANT — .5-diag proved bytes were on the server yet the save was still degenerate. Live render only worked because the plugin's warm pass painted the client-side object.
- **Fix:** Pass `recalculate=TRUE` for the injection callCommand when images are present (`var scribeInjectRecalc = !!(referencedImageNames && referencedImageNames.length);` at code.js:605, used as the 3rd callCommand arg at code.js:2402). `recalculate=true` runs `_afterEvalCommand → Reassign_ImageUrls` which — now that `evalCommand===false` — re-applies `setBlipFill` WITH history on each injected drawing, transmitting the change (x2t writes `<a:blip r:embed>` + a new word/media part) and firing `Add_NewImage`. FromJSON retained for geometry (Reassign's createDuplicate preserves stretch/tile/srcRect crop; spPr.xfrm extent/rotation untouched). Gated on `referencedImageNames` so the text-only path keeps its tuned `recalculate=false` behavior. Single undo preserved (Reassign appends to the same history point; no Create_NewPoint).
- **Files changed:** plugins/onlyoffice-scribe/scripts/code.js
---
