/*
 * capture-driver.js — golden-capture driver for the selection-cases harness.
 *
 * WHAT — the browser-side half of the golden-capture recipe (HARNESS-RUNBOOK §4).
 * It drives the flag-gated Scribe dev-hooks (injectAtSelection / dumpState) inside
 * the OnlyOffice EXAMPLE editor (http://localhost/example/editor?fileName=…) via a
 * single Chrome-DevTools-MCP evaluate_script, and returns one capture object per
 * (case, mode) — the same shape as the committed corpus/*/capture.json goldens.
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
 * The whole file is one IIFE that installs three globals on the editor window:
 *   __scribeFindHook()      -> the plugin window exposing __scribeTest, or null
 *   __scribeCaptureOne(c,o) -> Promise<captureObj> for one { id, mode, spec, md }
 *   __scribeCaptureBatch(cs,o) -> Promise<captureObj[]> (undo-resets between cases)
 * Flag-gated end to end: does nothing unless the plugin's test hooks are enabled.
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
      && JSON.stringify(a.selection) === JSON.stringify(b.selection);

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
})();
