# Phase 28: Ré-injection image au Replace, plugin-only — Research

**Researched:** 2026-07-06
**Domain:** OnlyOffice plugin API + sdkjs drawing ToJSON/FromJSON round-trip (Word)
**Confidence:** HIGH (all 4 open risks resolved against the actual OO 9.4 sdkjs source checked out locally; the only remaining gaps are two live-save confirmations the spike did not run)

## Summary

The spike-settled architecture (capture full drawing `ToJSON` → async pre-pass `getLocalImagePath(dataUrl)` → rewrite the blip → **one** `callCommand` doing `Api.FromJSON` + `AddDrawing` for text and images together) is not only sound, it is fully corroborated by the OO 9.4 sdkjs source located at `/home/ben/Dev-local/onlyoffice-sdkjs-94` (the 9.4 tree, which also contains `deploy/sdkjs/word/sdk-all-min.js` — the deployed minified bundle where `getLocalImagePath` is present). Every attribute the current PasteHtml path drops (crop/`srcRect`, rotation/flip, wrap/anchor, effects, alt-text, ratio-lock) survives the `ToJSON`↔`FromJSON` round-trip because the writer/reader are symmetric.

The single most important finding, which **reduces** the phase's risk versus the CONTEXT worry: **floating (anchored) images are preserved through `Api.FromJSON` + `AddDrawing`.** The line that looked lossy — `new ApiDrawing(ParaDrawingFromJSON(obj).GraphicObj)` — is not lossy, because `ImageFromJSON` sets the graphic's `.parent` back to the fully-rebuilt `ParaDrawing` (with `wrapType`, `drawingType`, `positionH/V`, `distance`, `behindDoc`), and `AddDrawing` re-inserts that same `ParaDrawing` via `getParaDrawing()` → `this.Drawing.parent`. So the anchored-wrap fallback is **likely unnecessary** — but because the spike only exercised an inline image, keep a cheap floating-detection guard as a safety fallback and confirm it live.

**Primary recommendation:** Implement the shared FromJSON+AddDrawing path exactly as the spike describes; rewrite `drawingJSON.graphic.blipFill.rasterImageId` to the `getLocalImagePath` result before `Api.FromJSON`; delete the marker/`injectPendingImages`/PasteHtml machinery and the undo-group stub; add a `drawingType === "anchor"` detection point wired to a PasteHtml fallback that stays dormant unless the live floating-save check fails.

<phase_requirements>
## Phase Requirements

There is no formal IMG-xx block in REQUIREMENTS.md; 28-CONTEXT.md + the ROADMAP success criteria are the source of truth. Mapping:

| ID | Description (from CONTEXT / success criteria) | Research Support |
|----|-----------------------------------------------|------------------|
| IMG-01 | Replace with image(s) → **a single undo** restores initial state | All mutation inside one `callCommand`; undo-group stub removed (it was a no-op in 9.4). One `callCommand` = one history point. **RESOLVED (28-02):** the injection callCommand was indeed one undo point, but the EXTRACTION pass's `ApiDrawing.SetName("scribe-img-N")` rename created a SECOND undo point right before it (why an image Insert took 2 undos while text-only took 1). Fixed by wrapping that rename in `AscCommon.History.TurnOff()`/`TurnOn()` (OO's own nestable no-history counter) so the rename applies + persists at save but records no undo point → a single undo. HIGH |
| IMG-02 | → **no perceptible flicker** (one render pass) | `getLocalImagePath` does not mutate the doc (async media register only); FromJSON+AddDrawing happen in the single injection `callCommand` → one recalculation/repaint. HIGH |
| IMG-03 | → **final selection covers injected content** (text + images), not a collapsed cursor | No post-`callCommand` PasteHtml to move the cursor; the existing end-of-callCommand post-selection (fix L#2) stays authoritative. HIGH |
| IMG-04 | image attrs preserved at save: size + crop/rotation; **floating wrap preserved** (or documented fallback) | ToJSON↔FromJSON symmetric for `extent`, `srcRect`, `xfrm.rot/flipH/flipV`, wrap/anchor, effects, locks, alt-text (source-verified). Floating preserved via `getParaDrawing()` parent back-ref. Fallback documented below. HIGH (source) / needs 1 live save check |
| IMG-05 | paragraph-image case: same guarantees (shared path) | Cell and paragraph both route through `addRunsToParagraph`/`addBlockToParagraph`; unify both onto the FromJSON+AddDrawing path. HIGH |
| (regression) | goldens T9 (cell), C1 (¶) + Insert stay green | Insert path is untouched (original media stays live); Replace path is the only change. Re-run existing goldens. |
</phase_requirements>

## User Constraints (from 28-CONTEXT.md)

### Locked Decisions
- **100% plugin-only, zéro modif sdkjs.** No sdkjs patch, no new upstream PR. (PR #4868 is extraction-only and out of scope.)
- **Replace** the marker + `injectPendingImages`/PasteHtml couple with the pre-pass + `FromJSON` + `AddDrawing` path, for **cell AND paragraph** (shared `addRunsToParagraph` / `addBlockToParagraph` / top-level image block).
- **Extraction unchanged** except: capture the **full `ToJSON`** of each image (instead of `{src,w,h}`).
- **Insert case untouched** (original stays live → media OK already).
- **Remove / neutralize** the `StartAction("GroupActions")` undo-group stub. Do **NOT** replace it with internal history grouping (`History.startGroupPoints`) — unnecessary once everything is in one `callCommand`.
- Keep a **PasteHtml fallback** only for any case that cannot go through FromJSON+AddDrawing (see floating risk).

### Claude's Discretion
- How to structure the async `getLocalImagePath` pre-pass (parallelize/batch the N round-trips if needed — latency is invisible to undo/flicker but real).
- Exactly where to capture the full ToJSON (dedicated read-only pre-pass `callCommand` vs. at extraction time).

### Deferred Ideas (OUT OF SCOPE)
- Internal history grouping (`History.startGroupPoints/endGroupPoints`).
- Any sdkjs change / new upstream PR.
- Refactor of extraction beyond "capture the full ToJSON".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Capture full drawing JSON of referenced images | Plugin `callCommand` (editor doc model) | — | `ToJSON()` needs live `ApiDrawing` objects; only runs inside a `callCommand`. |
| Register media for a data-URL | OO doc-server (via `getLocalImagePath` plugin method) | Plugin frame (async `executeMethod`) | `sendImgUrls` uploads to doc-server; returns a local media path. Does not touch the doc model. |
| Rewrite blip + reconstruct drawing + insert | Plugin `callCommand` (editor doc model) | — | `Api.FromJSON` + `AddDrawing` mutate the doc; must be the single injection point. |
| Final selection | Plugin `callCommand` (end of injection) | — | Post-selection set at end of the same `callCommand` (fix L#2). |

## Standard Stack

No external packages. This is a refactor of `plugins/onlyoffice-scribe/scripts/code.js` using **stock** OO 9.4 plugin/builder methods only.

| Method | Kind | Purpose | Source-verified location (OO 9.4) |
|--------|------|---------|-----------------------------------|
| `executeMethod("getLocalImagePath",[dataUrl], cb)` | async plugin method | Upload a data-URL to the doc-server, register media, return `{error,url,path}` | `common/apiBase_plugins.js:2497` (`pluginMethod_getLocalImagePath`); present in `deploy/sdkjs/word/sdk-all-min.js` |
| `Api.FromJSON(json)` | builder | Reconstruct a full `ApiDrawing` from a drawing `ToJSON` | `word/apiBuilder.js:5772`, drawing case `:5921` |
| `ApiDrawing.ToJSON()` | builder | Serialize a drawing to a `paraDrawing`-rooted JSON | `word/apiBuilder.js:20143` → `SerParaDrawing` |
| `ApiParagraph.AddDrawing(d)` | builder | Insert drawing into a paragraph (new run) | `word/apiBuilder.js:10838` |
| `ApiRun.AddDrawing(d)` | builder | Insert drawing into an existing run | `word/apiBuilder.js:12583` |

**No installation. No `npm view` needed.** Plugin is ES5-strict (no arrow functions, no `const`/`let`) — see Known Technical Constraints in STATE.md.

## The four open risks — findings + recommendations

### Risk 1 — FLOATING / wrapped image (was: highest uncertainty) → **RESOLVED: preserved by construction**

**Finding (source-verified, OO 9.4):**
- `SerParaDrawing` (`word/fromToJSON.js:5290`) writes the full anchor set: `drawingType` (`"inline"|"anchor"`, line 5317), `wrapType` (line 5316), `positionH/V`, `simplePos`, `distB/L/R/T`, `allowOverlap`, `behindDoc`, `sizeRelH/V`, `wrapTight/wrapThrough` polygons.
- `ParaDrawingFromJSON` (`:12373`) reads **all** of them back onto a real `ParaDrawing` (`Set_PositionH/V`, `Set_Distance`, `Set_BehindDoc`, `Set_DrawingType`, `Set_WrappingType`, wrapping polygon).
- The apparent lossy line `Api.FromJSON` → `new ApiDrawing(ParaDrawingFromJSON(obj).GraphicObj)` (`word/apiBuilder.js:5921`) is **not** lossy: `ImageFromJSON` (`:13666`) does `oImage.setParent(oParentDrawing)` (line 13672). So the graphic object keeps a back-reference to the fully-built `ParaDrawing`.
- `AddDrawing` (both `ApiParagraph:10838` and `ApiRun:12583`) inserts `oDrawing.getParaDrawing()`, and `getParaDrawing()` returns `this.Drawing.parent` (`:19302`) — i.e. the original `ParaDrawing` with all wrap/anchor intact.

**Conclusion:** A floating image reconstructed via `Api.FromJSON` and inserted via `AddDrawing` carries its wrap type, `behindDoc`, and anchor. The PasteHtml-only fallback is **most likely not needed.** (The exact page/column-relative *coordinates* re-anchor to the new insertion run, which is expected of any re-injection; the wrap *type* and float behaviour are preserved.)

**Recommendation:**
- Implement the single FromJSON+AddDrawing path for floating and inline alike — no branch needed for correctness per source.
- Nonetheless, **add a dormant detection+fallback** for safety (spike never tested floating live): detect floating via `parsedDrawing.drawingType === "anchor"` (top-level field of the drawing `ToJSON`). If a live floating-save check (see Open Questions Q1) shows the anchor is dropped or misplaced, route only `drawingType === "anchor"` images to a PasteHtml fallback and keep inline on the fast path. Do not build the fallback path speculatively beyond the detection hook.

**Provenance:** source-verified (sdkjs 9.4). The "preserved" claim is INFERRED from reading the reader/writer/AddDrawing chain, not yet live-confirmed at save.

### Risk 2 — crop / rotation / effects fidelity round-trip → **RESOLVED: symmetric, full fidelity**

The drawing `ToJSON` is a `paraDrawing` whose `graphic` (for an image) is `SerImage` = `{extX, extY, blipFill, nvPicPr, spPr, type:"image"}` (`word/fromToJSON.js:7728`). Attribute-by-attribute:

| Attribute | JSON path (from drawing root) | Writer | Reader | Survives? |
|-----------|-------------------------------|--------|--------|-----------|
| Size (bounding box) | `extent.cx/cy` + `graphic.extX/extY` + `graphic.spPr.xfrm.ext` | `SerParaDrawing`/`SerImage` | `setExtent` / `XfrmFromJSON` | ✅ |
| Crop | `graphic.blipFill.srcRect` (`{l,t,r,b}`) | `SerSrcRect` `:6970` | `SrcRectFromJSON` `:11910` | ✅ |
| Rotation | `graphic.spPr.xfrm.rot` | `:1968` | `XfrmFromJSON:15784` | ✅ |
| Flip H/V | `graphic.spPr.xfrm.flipH/flipV` | `:1966-1967` | `XfrmFromJSON:15782-15783` | ✅ |
| Effects (shadow/etc.) | `graphic.blipFill.blip[]` (Effects) + `graphic.spPr.effectLst` | `SerBlipFill`/`SerSpPr` | `BlipFillFromJSON`/`SpPrFromJSON` | ✅ |
| `rotWithShape` | `graphic.blipFill.rotWithShape` | `:7004` | `:11943` | ✅ |
| Ratio lock (`noChangeAspect`) | `cNvGraphicFramePr.graphicFrameLocks` / `graphic.nvPicPr` locks | `SerGraphicFrameLocks:5333` | locks restored | ✅ |
| Alt-text (title/descr) | `docPr` (via `SerCNvPr`) | `SerParaDrawing` | `CNvPrFromJSON` | ✅ |
| Borders | `graphic.spPr.ln` | `SerSpPr` | `SpPrFromJSON` | ✅ |

**Why the current path loses these:** PasteHtml starts from `<img width height src>` — a raster + size only. The FromJSON path starts from the complete serialized drawing, so **fidelity is total by construction.** The blip rewrite (Risk 4) touches only `blipFill.rasterImageId`; it does not disturb `srcRect`, `xfrm`, or effects (separate JSON fields).

**Recommendation:** No special handling needed at `AddDrawing` time. One end-to-end live save check on a cropped+rotated image is the only residual (Open Questions Q2). **Provenance:** source-verified; end-to-end-at-save is INFERRED, needs one live confirm.

### Risk 3 — `getLocalImagePath` in the real (cross-origin) Cozy frame → **RESOLVED: exists, async, well-defined shape**

**Finding (source-verified):** `common/apiBase_plugins.js:2497`
```js
Api.prototype["pluginMethod_getLocalImagePath"] = function(url) {
  window.g_asc_plugins.setPluginMethodReturnAsync();      // → async return
  AscCommon.sendImgUrls(this, [url], function(data) {      // upload data-URL to doc-server, register media
    var ret = { "error": true, "url": "", "path": "" };
    if (data[0] && data[0].path != null && data[0].url !== "error") {
      ret["error"] = false;
      ret["url"]  = AscCommon.g_oDocumentUrls.imagePath2Local(data[0].path);
      ret["path"] = data[0].path;                          // e.g. "media/image1.png"
    }
    window.g_asc_plugins.onPluginMethodReturn(ret);
  });
};
```
- **Exists in stock 9.4** (`@since 9.0.0`, undocumented) and is present in the deployed `deploy/sdkjs/word/sdk-all-min.js` (grep count 2). So no patch needed.
- **Response is async**, delivered to the `executeMethod(..., cb)` callback (via `setPluginMethodReturnAsync` + `onPluginMethodReturn`). Same async plugin-return channel that PasteHtml already uses successfully cross-origin in real Cozy today.
- **Response shape:** `{ error: false, url: "<local url>", path: "media/imageN.png" }` on success; `{ error: true, url: "", path: "" }` on failure.
- **Cross-origin:** the plugin↔editor bridge is `postMessage`-based regardless of origin; nothing in this method is origin-sensitive. Real-Cozy behaviour should match oo-dev. (Live confirm is a cheap check task, not a blocker — Open Questions Q3.)

**Batching concern (N images):** the stock method uploads exactly one URL per call (`sendImgUrls(this, [url], cb)` — single-element array). There is no stock multi-URL plugin method exposed. For N images, dispatch N `executeMethod` calls and join with a **counter barrier** (ES5 — no `Promise`/arrow). They can run in parallel (each returns independently); wait for all N callbacks before starting the injection `callCommand`. Handle `error:true` per image (fall back that image to PasteHtml or skip with a log).

**Recommendation:** async pre-pass, parallel dispatch, counter barrier, then one injection `callCommand`. **Provenance:** source-verified for existence/shape/async; cross-origin-in-real-Cozy is INFERRED (same channel as working PasteHtml), needs one live confirm.

### Risk 4 — blip rewrite mechanics → **RESOLVED: exact JSON path pinned; inline & floating share it**

**Finding (source-verified):**
- Writer: `SerBlipFill` (`word/fromToJSON.js:6980`) emits `rasterImageId = oBlipFill.getBase64RasterImageId(true)` → a **base64 data-URL** (confirmed by the existing `imageSpecFor` reading it as `src`, and the spike's "blip = data-URL").
- Reader: `BlipFillFromJSON` (`:11918`) does only `oBlipFill.setRasterImageId(oParsedFill["rasterImageId"])` (line 11944) — **it does not register media.** So if the blip is left as a data-URL → orphan at save (the current AddDrawing bug). If it is a **local media path already registered** (via `getLocalImagePath`) → valid blip + real media part.
- **Exact JSON path to rewrite:** for a top-level image drawing, `drawingJSON.graphic.blipFill.rasterImageId`. This is verified twice: the writer nests `blipFill` under the image `graphic` (`SerImage:7736`), and the **existing** `imageSpecFor` (code.js:1030-1032) already reads `JSON.parse(d.ToJSON()).graphic.blipFill.rasterImageId`.
- **Inline vs floating share the same blip location** — the difference lives at the `paraDrawing` root (`drawingType`, `wrapType`), never in `graphic.blipFill`. So one rewrite recipe covers both.

**Blip-rewrite recipe (exact):**
```
var j = JSON.parse(fullDrawingJson);      // captured ToJSON of the source image
// (data-URL that we already handed to getLocalImagePath)
var rasterId = ret.url;                    // imagePath2Local(path): "media/" prefix STRIPPED
j.graphic.blipFill.rasterImageId = rasterId;
var apiDrawing = Api.FromJSON(JSON.stringify(j));   // fresh drawing per insertion
para.AddDrawing(apiDrawing);              // or run.AddDrawing(apiDrawing)
```
- **RESOLVED (28-02): use `ret.url`, NOT `ret.path`.** The original recommendation (rewrite to `ret.path` = `"media/imageN.png"`, spike-verified at forcesave) was **inverted by the live-render check**: `ret.path` keeps the `"media/"` prefix, and `getFullImageSrc2` (`getImageUrl → getUrl("media/"+id)`) re-adds it, so a prefixed id resolves to `undefined` and the image paints **BLANK until reload**. The correct value is **`ret.url`** = `imagePath2Local(path)` (the media path with the `"media/"` prefix stripped) — OO's normal `rasterImageId` form, which resolves at render AND maps back at save. So `ret.path` is no longer even the fallback; `ret.url` is THE value used.
- One `Api.FromJSON` **per insertion** (it returns a fresh `ApiDrawing`); `AddDrawing` consumes it and checks `IsUseInDocument()` — a fresh drawing is not in the document, so the guard passes. No `Copy()` needed anymore.

**Provenance:** JSON path = source-verified + already used in current code. `ret.path` as the rewrite value = spike-verified (per CONTEXT).

## code.js touch-point map (what changes, what it becomes)

All line numbers are current (`plugins/onlyoffice-scribe/scripts/code.js`, 4844 lines).

| Location | Current behaviour | Becomes |
|----------|-------------------|---------|
| `imageSpecFor` (1026-1036) | Returns `{src(dataURL), w, h}` from `ToJSON().graphic.blipFill.rasterImageId` | Return the **full** `ToJSON()` string (+ the data-URL parsed out of it for the pre-pass). New shape e.g. `{json: fullJson, dataUrl: <blip>, name: name}`. Keep the same `graphic.blipFill.rasterImageId` read to get the data-URL. |
| `addImageMarker` (1039-1050) | Appends a ` IMG:N ` text-marker run; pushes to `pendingImages` | **Delete.** Replaced by direct `FromJSON`+`AddDrawing` at the run/block build site. |
| `pendingImages` array + `restoreImage`/`imageCache`/`Copy()` pre-cache (990-1014, 1025) | Copy() deep-copies each drawing pre-InsertContent; cell path uses `AddDrawing(Copy())` (orphan-at-save bug); top-level uses markers | **Replace** with a `name → {json, localPath}` map populated by the read-only pre-pass + `getLocalImagePath`. `Copy()` no longer needed (FromJSON reconstructs). |
| `addRunsToParagraph` (1449-1463) image branch | `if imageSink: addImageMarker(...)` else `AddDrawing(restoreImage(...))` (orphan bug) | Single branch: `run.AddDrawing(Api.FromJSON(rewrittenJson))` for **both** cell and paragraph (drop the `imageSink` split). |
| `addBlockToParagraph` (1181-1191) image branch | `addImageMarker(para, block.name, ...)` for cell block images | `para.AddDrawing(Api.FromJSON(rewrittenJson))`. |
| Top-level `image_placeholder` block (1793-1801) | `addImageMarker(imgPara, block.name, ...)` | Build `imgPara`, `imgPara.AddDrawing(Api.FromJSON(rewrittenJson))`. |
| `code_block` image branch (1720-1721) | `addImageMarker(p, run.imageMarker, ...)` | Same FromJSON+AddDrawing (unlikely case, keep parity). |
| callback after injection `callCommand` (2359-2373) | Parses `pendingImages`, calls `injectPendingImages`, then `endUndoGroup()` | Simplify to: `pasteInProgress = false;` (no pending images, no PasteHtml, no undo-group). |
| `injectPendingImages` (2376-2444) | Per-image `callCommand`(find marker) + `PasteHtml` + 60ms | **Delete entirely.** |
| `startUndoGroup`/`endUndoGroup` (382-400) + `undoGroupOpen` flag (118-121) | `StartAction/EndAction("GroupActions")` — a **no-op stub** in OO 9.4 (`startGroupActions`/`endGroupActions` = empty fns) | **Delete** all calls (530, 564, 366-if-present, 2366, 2372) and the helpers. Nothing replaces them — one `callCommand` already = one undo point. |
| **NEW** read-only pre-pass | — | New `callCommand` (or reuse extraction capture) that builds the `drawingIndex` (scan `GetAllParagraphs` + table cells, code path already exists at 949-985), captures each referenced image's full `ToJSON` + data-URL, returns them to the plugin side. Read-only → no history point, no repaint. |
| **NEW** async media pre-pass | — | Plugin side: for each captured image, `executeMethod("getLocalImagePath",[dataUrl], cb)`; counter barrier; build `name → localPath`; pass via `Asc.scope` into the injection `callCommand`. |

### Ordering constraints for the single injection `callCommand`

1. **`getLocalImagePath` must fully complete for every image _before_ the injection `callCommand` starts.** The media must be registered so the rewritten `rasterImageId` resolves. (Async pre-pass, counter barrier.)
2. The **full `ToJSON` must be captured _before_ `InsertContent`/selection replacement destroys the source drawings.** Either a dedicated read-only pre-pass `callCommand` (recommended — fresh, handles images edited since extraction) or capture at extraction time (optimization; risks staleness).
3. **All text + all images go in the same injection `callCommand`.** No post-`callCommand` mutation (that reintroduces the multi-undo/flicker/selection-loss bugs).
4. **Fresh `Api.FromJSON` per insertion** (do not reuse one `ApiDrawing` for two `AddDrawing` calls — `AddDrawing` binds it into the document).
5. Post-selection (fix L#2) stays at the **end** of the injection `callCommand` and remains the last thing that touches the selection.

## Floating-image detection + fallback decision

- **Needed?** Probably **not** (source shows floating is preserved). Implement the fast path for all images.
- **Detection (if the live check forces a fallback):** `JSON.parse(fullDrawingJson).drawingType === "anchor"` → floating; `"inline"` → inline. (Top-level field of the drawing `ToJSON`, written at `SerParaDrawing:5317`.)
- **Fallback shape (only if triggered):** route `anchor` images to a post-`callCommand` PasteHtml of `<img>` (the current mechanism) — accepting that PasteHtml re-inlines them (documented loss per IMG-04's "or documented fallback"). Keep inline images on the FromJSON fast path. **Do not build this speculatively** beyond the one-line detection hook; wire it only if Q1 fails live.

## Common Pitfalls

### Pitfall 1: leaving the blip as a data-URL
**What goes wrong:** image renders live but is dropped at save (orphan blip, no media part). **Why:** `BlipFillFromJSON` calls `setRasterImageId` without registering media. **Avoid:** always rewrite `graphic.blipFill.rasterImageId` to the `getLocalImagePath` result before `FromJSON`. **Warning sign:** `word/media/` empty after forcesave; `<a:blip>` with no `r:embed`.

### Pitfall 2: reusing one ApiDrawing for multiple AddDrawing
**What goes wrong:** second insertion silently fails (`AddDrawing` returns null/false on `IsUseInDocument()`). **Avoid:** one `Api.FromJSON` per insertion.

### Pitfall 3: starting the injection callCommand before media is registered
**What goes wrong:** race — some blips resolve, some orphan. **Avoid:** counter barrier over all N `getLocalImagePath` callbacks.

### Pitfall 4: re-adding an undo-group "to be safe"
**What goes wrong:** the 9.4 `GroupActions` stub is a no-op; adding internal history grouping is fragile and explicitly out of scope. **Avoid:** rely solely on the single `callCommand` = single undo point. (STATE/CONTEXT: the `cc272d2e0` "probe-confirmed" grouping was wrong for 9.4.)

### Pitfall 5: ES5 slip
Plugin is ES5-strict. No arrow functions, no `const`/`let`, no `Promise` in the async barrier — use a plain counter and function declarations.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Register a data-URL as doc media | custom upload to doc-server | stock `getLocalImagePath` | Handles `sendImgUrls`/`g_oDocumentUrls` registration and the local-path mapping. |
| Reconstruct a drawing with all attrs | manual `AddImage`/`SetSize` reassembly | `Api.FromJSON(ToJSON)` | Symmetric round-trip preserves crop/rot/wrap/effects/locks/alt-text for free. |
| Collapse multiple edits into one undo | `GroupActions` / `startGroupPoints` | one `callCommand` | Group primitives are a no-op stub in 9.4; a single `callCommand` is already atomic. |

## Runtime State Inventory

Not applicable as a data-migration surface. This is a **code-path replacement** with no persisted state carrying an old identifier:
- **Stored data:** None — the ` IMG:N ` marker is a transient in-memory token that never reaches saved `.docx` (it's replaced before save today; it simply stops existing after this change).
- **Live service config / OS-registered state / secrets:** None.
- **Build artifacts:** the plugin ships as `plugins/onlyoffice-scribe/scripts/code.js` mounted into oo-dev per worktree; no compiled artifact to invalidate. Re-mount/hard-reload after editing (per `drive_build_appdir.md`/`oo_dev_environment.md`).

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| OO doc-server (docker `oo-dev`) | live UAT of Replace + save round-trip | ✓ (re-point to `cozy-drive-image-reinject` worktree per CONTEXT) | 9.4.0.1 | — |
| Stock sdkjs `getLocalImagePath` | media registration | ✓ | present in `deploy/sdkjs/word/sdk-all-min.js` (9.4) | none needed |
| Local sdkjs 9.4 source (read-only ref) | planning/verification | ✓ | `/home/ben/Dev-local/onlyoffice-sdkjs-94` | `/home/ben/Dev-local/onlyoffice-sdkjs` |
| Real Cozy frame (cross-origin) | prod confirmation of async `executeMethod` | needs live check | — | same postMessage channel as working PasteHtml |

**No blocking gaps.** All planning-time facts are source-verified; the env is needed only for the two live save checks and the cross-origin confirm.

## Security Domain

`security_enforcement` is not set in config (treated as enabled), but this phase's attack surface is minimal and unchanged: it consumes **data-URLs of images already present in the user's own document** (extracted earlier by the same plugin) and hands them to the stock `getLocalImagePath`, which is exactly the path OO itself uses for pasted images. No new external input, no auth, no crypto, no network endpoint beyond the doc-server the editor already trusts.

| ASVS category | Applies | Note |
|---------------|---------|------|
| V5 Input validation | marginal | Data-URLs originate from the doc's own drawings; `getLocalImagePath` returns `{error:true}` on bad input — handle it (skip/fallback), don't inject an empty path. |
| V6 Cryptography | no | none |
| V2/V3/V4 Auth/session/access | no | client-side editor plugin; no auth surface introduced |

**Threat note:** the only new failure mode is an unhandled `error:true` from `getLocalImagePath` producing an empty `rasterImageId` → orphan/blank image. Mitigation: per-image error handling (fallback that image to PasteHtml or skip with a log).

## Assumptions Log

| # | Claim | Section | Provenance | Risk if wrong |
|---|-------|---------|-----------|---------------|
| A1 | Floating (anchor) wrap is fully preserved through FromJSON+AddDrawing | Risk 1 | INFERRED from sdkjs 9.4 source (reader/writer/getParaDrawing chain); spike tested inline only | Need `drawingType==="anchor"` PasteHtml fallback (already scoped as a hook) |
| A2 | Cropped+rotated image survives end-to-end **at save** | Risk 2 | INFERRED (writer/reader symmetric); spike verified the round-trip mechanism, not this specific attr at save | Low — fields are independent; would show as one wrong attr, not data loss |
| A3 | `getLocalImagePath` async `executeMethod` responds in the **real cross-origin Cozy** frame | Risk 3 | INFERRED (source confirms method + async return; same channel as working PasteHtml); spike ran in oo-dev | Blocks the whole approach in prod — but very low (channel already proven) |
| A4 | ~~Rewriting the blip to **`ret.path`** (not `ret.url`) yields a valid non-orphan blip~~ **RESOLVED (28-02): use `ret.url`.** `ret.path` (prefix kept) renders BLANK until reload (getFullImageSrc2 double-prefixes to undefined); `ret.url` (prefix stripped) resolves at render AND at save. | Risk 4 | Was SPIKE-VERIFIED for save-only; live-render check inverted it to `ret.url` | — (resolved: the one-line swap to `ret.url` was applied in 28-02) |

## Open Questions (live checks the planner should add as tasks)

1. **Floating image, at save (Q1 / A1).** Replace a selection containing a **floating/wrapped** image; forcesave; confirm the saved `.docx` keeps the anchor + wrap (not re-inlined). If it fails → enable the `drawingType==="anchor"` PasteHtml fallback.
   - Known: source restores all anchor/wrap fields and `getParaDrawing()` returns the anchored `ParaDrawing`.
   - Unclear: whether OO re-anchors cleanly when the drawing is inserted into a freshly-built run.
2. **Crop+rotation, at save (Q2 / A2).** Replace with a cropped + rotated image; forcesave; open the `.docx` and confirm `srcRect` + `xfrm.rot` survive.
3. **Cross-origin real Cozy (Q3 / A3).** Confirm `executeMethod("getLocalImagePath",…)` fires its callback in the real Cozy plugin frame (not just oo-dev).
4. **Rewrite value path vs url (Q4 / A4). RESOLVED (28-02): `ret.url`.** `ret.path` gave a valid blip AT SAVE but rendered BLANK until reload (getFullImageSrc2 re-adds the `"media/"` prefix → undefined src). Switched to `ret.url` (prefix-stripped), which resolves at render AND at save. No longer open.

## Sources

### Primary (HIGH — sdkjs 9.4 source, read directly)
- `/home/ben/Dev-local/onlyoffice-sdkjs-94/common/apiBase_plugins.js:2497` — `getLocalImagePath` (async, `{error,url,path}`)
- `/home/ben/Dev-local/onlyoffice-sdkjs-94/word/fromToJSON.js` — `SerParaDrawing:5290`, `SerBlipFill:6980`, `SerSrcRect:6970`, `SerImage:7728`, `BlipFillFromJSON:11918`, `ParaDrawingFromJSON:12373`, `ImageFromJSON:13666`, `XfrmFromJSON:15772`
- `/home/ben/Dev-local/onlyoffice-sdkjs-94/word/apiBuilder.js` — `Api.FromJSON:5772/5921`, `ApiParagraph.AddDrawing:10838`, `ApiRun.AddDrawing:12583`, `getParaDrawing:19302`, `ApiDrawing.ToJSON:20143`, `private_CheckDrawingOnAdd:176`
- `/home/ben/Dev-local/onlyoffice-sdkjs-94/common/Drawings/Format/Format.js:3815` — `getBase64RasterImageId`
- `/home/ben/Dev-local/onlyoffice-sdkjs-94/deploy/sdkjs/word/sdk-all-min.js` — confirms `getLocalImagePath` present in the deployed bundle
- `plugins/onlyoffice-scribe/scripts/code.js` — current Replace/reinjection path (all touch-points above)

### Secondary (spike + project memory)
- `.planning/phases/28-image-reinjection-plugin-only/28-CONTEXT.md` — spike results (round-trip live-verified on a cell image; `ret.path` rewrite verified at forcesave)
- MEMORY: `project_image_reinjection_v33.md`, `oo_plugin_gotchas_focus_timing_redo.md`, `oo_redo_disabled_in_coediting.md`

## Metadata

**Confidence breakdown:**
- Blip rewrite (Risk 4): HIGH — JSON path source-verified + already used in code; rewrite value spike-verified.
- Fidelity (Risk 2): HIGH — writer/reader symmetric across all attrs; one live save check remains.
- `getLocalImagePath` (Risk 3): HIGH for existence/shape/async; MEDIUM for real-Cozy cross-origin (same channel as PasteHtml).
- Floating (Risk 1): MEDIUM-HIGH — source strongly indicates preservation; not yet live-confirmed at save, hence the dormant fallback hook.
- Touch-point map: HIGH — read directly from current code.js.

**Research date:** 2026-07-06
**Valid until:** stable while on OO 9.4.0.1 (re-verify if the doc-server image is bumped).

## RESEARCH COMPLETE
