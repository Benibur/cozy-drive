/*
 * capture-driver.js — golden-capture driver for the selection-cases harness.
 *
 * WHAT — the browser-side half of the golden-capture recipe (HARNESS-RUNBOOK §4).
 * It drives the flag-gated Scribe dev-hooks (injectAtSelection / dumpState) inside
 * the OnlyOffice EXAMPLE editor (http://localhost/example/editor?fileName=…) via a
 * single Chrome-DevTools-MCP evaluate_script, and returns one capture object per
 * (case, mode) — the same shape as the committed corpus/<case>/<mode>/capture.json
 * goldens. (Do not write that path with a glob star: `*` followed by `/` closes this
 * block comment and the file stops parsing — it silently did until 2026-07-17.)
 *
 * WHY a committed file (vs an ad-hoc pasted snippet): the driver is the reusable,
 * error-prone part (frame walking, undo-reset, spec grammar, stability double-read,
 * table-vs-plain fixture md). Committing it makes captures reproducible and reviewable.
 *
 * HOW TO RUN (per the RUNBOOK):
 *   1. Serve the fixture into the example + open it:
 *        curl -s -X POST http://localhost/example/upload \
 *          -F "uploadedFile=@FIXTURE.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
 *        new_page  http://localhost/example/editor?fileName=FIXTURE.docx   (fresh isolatedContext)
 *   2. evaluate_script: paste THIS file, then call it, e.g.
 *        return await __scribeCaptureBatch(CASES, { capturedVia: "…", capturedAt: "YYYY-MM-DD" })
 *      where CASES = [{ id, mode, spec, md }, …]  (spec = parseSelSpec grammar: `..` separator,
 *      `T1.full`, `T1.C(r,c)@kind`, `P<n>@kind`; md = injected fixture — PLAIN text for intra-cell/
 *      paragraph cases, `[CELL:r,c]…[/CELL]` for whole/partial tables, `[TABLE:i]…[/TABLE]\n\ntext`
 *      for table↔paragraph crossings).
 *   3. Per returned capture: write capture.json; forcesave -> after.docx via tools/assemble.py;
 *      screenshots before/after; normalize -> model.json via tools/normalize.mjs; meta.json verdict
 *      is HUMAN-owned (leave "verdict":"pending" for the blessing pass).
 *
 * The selection specs the dev-hook accepts and which cases ride which branch are
 * documented in code.js `parseSelSpec` / `selSpecSupported`.
 *
 * The whole file is one IIFE that installs these globals on the editor window:
 *   __scribeFindHook()      -> the plugin window exposing __scribeTest, or null
 *   __scribeCaptureOne(c,o) -> Promise<captureObj> for one { id, mode, spec, md }
 *   __scribeCaptureBatch(cs,o) -> Promise<captureObj[]> (undo-resets between cases)
 *   __scribeCaptureBefore(c) -> Promise<{ok, extractedMd, md}>  [phase 1 of 2]
 *   __scribeCaptureAfter(c,b) -> Promise<captureObj>            [phase 2 of 2]
 * Flag-gated end to end: does nothing unless the plugin's test hooks are enabled.
 *
 * WHY the two-phase split (Before/After) on top of captureOne: before.png must show the
 * POSED SELECTION, which only exists between setSelection and injectAtSelection. A single
 * evaluate_script cannot be interrupted to let MCP take a screenshot, so the phases are
 * separate calls: captureBefore -> take_screenshot(before.png) -> captureAfter ->
 * take_screenshot(after.png). captureOne stays as the un-screenshotted fast path.
 *
 * IMAGE CASES: never hard-code an image name. The extraction RENAMES images on every pass
 * (scribe-img-4 -> scribe-img-5) and the rename SURVIVES undo (it is outside the history),
 * so a hard-coded name resolves to nothing and the marker silently drops. Write the case md
 * with the literal placeholder __IMG__ and captureBefore substitutes the name the live
 * extraction just emitted. Only `![IMG:name](placeholder)` / `{{IMG:name}}` are image
 * markdown -- a bare `![IMG:name]` is literal text.
 */
(function () {
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // Walk every same-origin frame to find the plugin window that exposes __scribeTest.
  // In OO example mode all frames are same-origin (localhost) so this reaches the
  // dynamically-created plugin iframe without a postMessage relay.
  function findHook() {
    var seen = new Set(), found = null;
    (function walk(w) {
      if (!w || seen.has(w)) return; seen.add(w);
      try { if (typeof w.__scribeTest === "function") found = w; } catch (e) {}
      try { for (var i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {}
    })(window);
    return found;
  }

  // Reset the document to its pristine fixture state between cases. asc_undoAllChanges
  // is the editor-level undo (no re-upload needed); it lives on the OO api, not the
  // plugin, so search all frames for it.
  function undoAll() {
    (function walk(w) {
      try { if (w.Asc && w.Asc.editor && w.Asc.editor.asc_undoAllChanges) w.Asc.editor.asc_undoAllChanges(); } catch (e) {}
      try { for (var i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {}
    })(window);
  }

  async function dump(sw, scope) {
    for (var i = 0; i < 5; i++) {
      var r = await sw.__scribeTest({ action: "dumpState", scope: scope || "full" });
      if (r && !r.error) return r;
      await sleep(300);
    }
    return { error: "dumpState failed" };
  }

  // Turn on paragraph marks so before/after.png show the ¶ boundaries the rules are about.
  function paraMarks() {
    (function walk(w) {
      try { if (w.Asc && w.Asc.editor && w.Asc.editor.put_ShowParaMarks) w.Asc.editor.put_ShowParaMarks(true); } catch (e) {}
      try { for (var i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {}
    })(window);
  }

  // Substitute the __IMG__ placeholder with the image name the live extraction just emitted.
  // See the IMAGE CASES note in the header: names drift across passes and survive undo.
  function resolveMd(md, extractedMd) {
    if (!md || md.indexOf("__IMG__") === -1) return md;
    var m = /(?:!\[IMG:|\{\{IMG:)(scribe-img-\d+)/.exec(extractedMd || "");
    if (!m) return { error: "no image marker in extraction", extractedMd: extractedMd };
    return md.split("__IMG__").join(m[1]);
  }

  // Phase 1: reset, pose the selection, run the REAL extraction. Leaves the doc showing
  // the selection so the caller can screenshot before.png. See captureOne for why the
  // extraction is mandatory (parsedTables).
  async function captureBefore(c) {
    var sw = findHook();
    if (!sw) return { ok: false, error: "no scribe hook" };
    sw.__scribeTestForce = true;

    undoAll(); await sleep(600);
    await sw.__scribeTest({ action: "dumpState" }); await sleep(250);
    paraMarks();

    var setRes = null, extRes = null;
    try { setRes = await sw.__scribeTest({ action: "setSelection", spec: c.spec }); } catch (e) { setRes = { ok: false, error: String(e) }; }
    await sleep(250);
    try { extRes = await sw.__scribeTest({ action: "extractSelection" }); } catch (e) { extRes = { ok: false, error: String(e) }; }
    await sleep(300);

    var md = resolveMd(c.md, extRes && extRes.md);
    if (md && md.error) return { ok: false, error: md.error, extractedMd: md.extractedMd, setRes: setRes };
    return { ok: true, setRes: setRes, extractedMd: extRes && extRes.md, md: md };
  }

  // Phase 2: inject the (resolved) md at the selection posed by captureBefore, then read
  // back. Returns the corpus capture.json shape.
  async function captureAfter(c, before, opts) {
    opts = opts || {};
    var sw = findHook();
    if (!sw) return { id: c.id, mode: c.mode, error: "no scribe hook" };
    sw.__scribeTestForce = true;
    var md = (before && before.md) || c.md;

    var inj = null;
    try {
      inj = await sw.__scribeTest({ action: "injectAtSelection", spec: c.spec, md: md, mode: c.mode });
    } catch (e) { inj = { ok: false, error: String(e) }; }
    // 2500ms, not 1300: a full-table INSERT re-selects the whole inserted table in a DEFERRED
    // follow-up callCommand (the freshly-inserted table's cell positions only settle after the
    // injection callCommand's recalc — build 2026-07-19.4). Dumping too early captures the
    // intermediate N-1-cell selection. The stability double-read below still guards the rest.
    await sleep(2500);

    var a = await dump(sw, "full");
    await sleep(400);
    var b = await dump(sw, "full");
    var stable = JSON.stringify(a.blocks) === JSON.stringify(b.blocks)
      && JSON.stringify(a.selText) === JSON.stringify(b.selText)
      && JSON.stringify(a.selMarkup) === JSON.stringify(b.selMarkup);

    return {
      id: c.id,
      spec: c.spec,
      mode: c.mode,
      fixture: md,
      fixtureTemplate: c.md !== md ? c.md : undefined,
      setRes: before && before.setRes,
      extractedMd: before && before.extractedMd,
      inj: inj,
      injOk: !!(inj && inj.ok !== false),
      injErr: inj && inj.error,
      stable: stable,
      blocks: b.blocks,
      selection: b.selection,
      // THE oracle of selection (build .5). dumpState returns these as TOP-LEVEL siblings of
      // `selection` — forwarding only `blocks`+`selection` (as this driver and normalize.mjs
      // both did until 2026-07-17) silently drops them and every model.json lands selText:null.
      selText: b.selText,
      selMarkup: b.selMarkup,
      selMarkupTruncated: b.selMarkupTruncated,
      capturedVia: opts.capturedVia || "capture-driver.js two-phase (Chrome DevTools MCP)",
      capturedAt: opts.capturedAt || null
    };
  }

  // Capture ONE (case, mode). Returns the corpus capture.json shape.
  async function captureOne(c, opts) {
    opts = opts || {};
    var sw = findHook();
    if (!sw) return { id: c.id, mode: c.mode, error: "no scribe hook" };
    sw.__scribeTestForce = true;

    undoAll(); await sleep(600);
    // First callCommand after a reset is flaky -> warm-up read.
    await sw.__scribeTest({ action: "dumpState" }); await sleep(250);

    // CRITICAL for TABLE cases: pose the selection and run the REAL extraction FIRST.
    // The table clone/partial-copy path reads Asc.scope.parsedTables, which is populated
    // ONLY by the extraction scan (code.js ~556). injectAtSelection alone (no prior
    // extraction) leaves parsedTables null -> the clone silently no-ops (falls back to
    // plain insert). So: setSelection -> extractSelection -> injectAtSelection. Harmless
    // for plain paragraph/intra-cell cases (they don't read parsedTables).
    var setRes = null, extRes = null;
    try { setRes = await sw.__scribeTest({ action: "setSelection", spec: c.spec }); } catch (e) { setRes = { ok: false, error: String(e) }; }
    await sleep(250);
    try { extRes = await sw.__scribeTest({ action: "extractSelection" }); } catch (e) { extRes = { ok: false, error: String(e) }; }
    await sleep(300);

    var inj = null;
    try {
      inj = await sw.__scribeTest({ action: "injectAtSelection", spec: c.spec, md: c.md, mode: c.mode });
    } catch (e) { inj = { ok: false, error: String(e) }; }
    await sleep(1300);

    // Stability: two reads must match (strips any late async settling).
    var a = await dump(sw, "full");
    await sleep(400);
    var b = await dump(sw, "full");
    var stable = JSON.stringify(a.blocks) === JSON.stringify(b.blocks)
      && JSON.stringify(a.selText) === JSON.stringify(b.selText)
      && JSON.stringify(a.selMarkup) === JSON.stringify(b.selMarkup);

    return {
      id: c.id,
      spec: c.spec,
      mode: c.mode,
      fixture: c.md,
      setRes: setRes,
      extractedMd: extRes && extRes.md,
      inj: inj,
      injOk: !!(inj && inj.ok !== false),
      injErr: inj && inj.error,
      stable: stable,
      blocks: b.blocks,
      selection: b.selection,
      selText: b.selText,
      selMarkup: b.selMarkup,
      selMarkupTruncated: b.selMarkupTruncated,
      capturedVia: opts.capturedVia || "capture-driver.js (Chrome DevTools MCP)",
      capturedAt: opts.capturedAt || null
    };
  }

  async function captureBatch(cases, opts) {
    var out = [];
    for (var i = 0; i < cases.length; i++) {
      out.push(await captureOne(cases[i], opts));
    }
    undoAll(); await sleep(500);
    return out;
  }

  window.__scribeFindHook = findHook;
  window.__scribeCaptureOne = captureOne;
  window.__scribeCaptureBatch = captureBatch;
  window.__scribeCaptureBefore = captureBefore;
  window.__scribeCaptureAfter = captureAfter;
})();
