(function(window, undefined) {
  "use strict";

  // ---- Build marker ----
  // Bump SCRIBE_BUILD on every meaningful code.js change so a loaded build can be
  // identified despite OO's immutable plugin cache. Verify which build is live:
  //   • browser console → look for the "[Scribe] build …" line at plugin load/init;
  //   • or evaluate `window.__scribeBuild` in the plugin iframe.
  // If the console shows an OLDER build than expected, the editor served a CACHED
  // code.js → reopen the editor in a fresh tab / private window (a plain F5 won't
  // refetch the async plugin iframe).
  var SCRIBE_BUILD = "2026-07-17.9 — A6/Ac6 insert post-sel off-by-one : la selection avalait 1 caractere du suffixe HOTE (<<Second e>>r flows au lieu de <<Second >>er flows) ; fige et BENI dans les goldens A6/insert + Ac6/insert, invisible sous la forme end:{block:3,offset:10} — revele par selMarkup (build .5). Cause : l'ancre de FIN etait ARITHMETIQUE (selectLast.GetEndPos() - mergedTrailingLen) en unites de position OO, qui comptent les frontieres de runs — donc la LITIERE DE RUNS VIDES laissee en quantite VARIABLE par les chemins d'injection (A6 : 1 run vide en insert, 2 en replace, pour le meme texte final) decale le resultat ; le replace tombait juste par hasard. Fix : ancre REELLE mergedTrailingStart (= fin du ¶ AVANT l'append, capturee a la fusion) — meme remede que la sentinelle du chemin inline (cf commentaire l.1936 : 'positions count run boundaries -> off-by-N'). — ORACLE selection : dumpState emet selText (le texte couvert par la selection) + selMarkup (ce texte en situ, encadre << >>). Les unites de position {block,offset} restent emises mais sont DEMONETISEES (debug only, plus dans le modele normalise). Motif : offset compte les frontieres d'elements RUNS VIDES INCLUS, que paraToBlock saute et que normalizeModel refiltre -> les 2 champs sont en desaccord sur ce qui est du bruit (la litiere de runs vides du chemin replace decale les nombres sans rien changer a l'ecran) ; et un nombre opaque est imbenissable (le golden A6/insert a fige, beni, une post-selection avalant 1 caractere de l'hote). — REGRESSION table-insert : cleanupTrailingBlockPara DETRUISAIT le ¶ suivant le tableau insere (T3/H1 'Outro paragraph' perdu). La branche de fusion A6 (build .4) se gardait sur blocks[last] = le ¶ PLACEHOLDER SCRIBE-TABLE-n (plain) au lieu de content[last] = le TABLEAU reel -> appendRunsPreserving no-op sur un tableau PUIS RemoveElement du ¶ hote. Fix : garde lastIsTable (meme patron qu'insSimpleInline l.2177 / isSimpleInline l.2233) -> la branche de fusion et la propagation de style sont sautees quand le dernier element injecte est un tableau. Regression LATENTE depuis le build 2026-07-16.4 (merge A6) : l'axe tableau n'avait pas ete rejoue depuis. — 2026-07-17.3 — T-intra axe A : hookSetSelection supporte aussi `.P<m>` + multi-¶ intra-cellule (pour les captures before.png). — 2026-07-17.2 — T-intra axe A : grammaire driver `T<n>.C(r,c).P<m>@kind` (¶ m-ieme d'une cellule) + resolution multi-¶ intra-cellule (ExpandTo de 2 offsets par-¶) dans le test-hook -> permet A5/A6 DANS une cellule. — 2026-07-17.1 — T-intra axe A complet : replace-mode smart-spacing rendu cell-aware (hostAt via findHostParaAt) — corrige 'The quickXXX'/'XXXquick' (espace de collage manquant au REPLACE intra-cellule, A2/A4 replace). Fixture table-arules.docx (cellule-phrase + cellule 3-¶). — 2026-07-16.12 — T-intra V2 : re-collapse para-relatif GATE intra-cellule seulement (top-level garde doc.GetRange(insPos,insPos) — sinon +2 sur la post-sel inline A2/A4). — 2026-07-16.11 — T-intra V2 : fix curseur @end dernier ¶ de cellule (GetText renvoie 'texte\\t' -> l'offset @end depassait le texte des runs -> fallback offset 0 = XXXAlpha). Strip du \\t terminateur de cellule dans host-detection + test-hook. — 2026-07-16.10 — T-intra V2 (regles A intra-cellule) : host-detection cell-aware (findHostParaAt descend dans les cellules) -> smart-spacing + bord->nouveau ¶ (insCaretAtEnd) s'appliquent intra-cellule ; re-collapse du curseur via hostPara.GetRange(off,off) (para-relatif, fiable en cellule) au lieu de doc.GetRange(insPos,insPos) absolu (retombait a 0 -> XXXAlpha). — 2026-07-16.9 — T-intra V3 (harnais dev-hook) : dumpState.locate situe desormais une selection INTRA-CELLULE -> {block:<idx table>, cell:{r,c}, cellBlock:<¶ dans la cellule>, offset} (avant : block:-1, post-sel intra-cellule aveugle). Inert en prod (flag-gated dumpState). — 2026-07-16.8 — T8/intra-cell corruption : l'injection multi-¶ (chemin bloc) DANS une cellule aspirait le ¶ top-level apres le tableau (Outro) dans la cellule. Cause : cleanupTrailingBlockPara/cleanupLeadingSpacer scannaient doc.GetElement (top-level) -> traversaient la frontiere de cellule. Fix : scanner le contenu de la CELLULE hote (GetParentTableCell().GetContent()) quand l'injecte est intra-cellule. Regression latente depuis build .4 (branche merge A6). NB : autres regles A intra-cellule (bord->nouveau ¶, espaces, post-sel) encore non portees (host-detection l.852 = top-level only). — 2026-07-16.7 — A6-postsel : la post-selection du chemin BLOC couvrait TOUT le 1er/dernier ¶ d'injection (prefixe/suffixe hote inclus). Fix sans sentinelle : (1) INSERT dont le 1er para plain fusionne le prefixe (firstParaMergedInline) demarre la selection au point de fusion (preSelStart), comme le chemin inline A2/A4 ; (2) mergedTrailingLen mesure (span de position, pas char) le suffixe fusionne dans cleanupTrailingBlockPara -> la selection exclut le suffixe hote. Replace-start deja OK (preSelStart). — 2026-07-16.6 — A3 : extraction d'une selection partielle finissant en fin de ¶ (souris = marque ¶ \r\n dans GetText) -> strip du \r\n traînant de rangeText avant le clip (sinon indexOf echoue et le ¶ ENTIER est extrait). — 2026-07-16.5 — A8 : garde de perf sur ¶ top-level (hors cellules) + backstop >500 ; corrige la perte de md au select-all sur doc a tableaux. — 2026-07-16.4 — §5bis A6 : dernier para injecté fusionne le suffixe (merge dans cleanupTrailingBlockPara, formatage preserve). — 2026-07-16.3 — §5bis A6 : insertion multi-¶ au milieu -> inline splice (1er para fusionne prefixe, DERNIER fusionne suffixe). — 2026-07-16.2 — §5bis règle d'insertion (UAT A1/A5) : collage en fin de ¶ non-vide -> NOUVEAU ¶ (spacer trick) au lieu de fusion inline. — 2026-07-16.1 — fix(§4quater): mixed cross-table<->paragraph REPLACE no longer corrupts a top-of-body table under header/footer position collision (H2/replace). Root cause: the non-table-paragraph classification used a raw-position test against GetAllTables (incl. header/footer tables) -> top-of-body paragraph misclassified as in-table -> mixed in-place path skipped -> destructive full-range InsertContent deleted a table row. Fix: element-based GetParentTableCell() membership test. — 2026-07-15.3 dev-probe: probeTables hook (GetAllTables position-collision diagnostic for header/footer-table docs, flag-gated, inert in prod; harness §4quater fixture calibration) — 2026-07-15.2 fix: insert-after-table via body elements + intra_cell only when whole selection is in the cell — header/footer table position-collision (no_cell_match false-positive -> not_involved fall-through; cross-table cell-coord crash -> table-identity filter + GetCell bounds guard; not_involved no longer breaks table scan) — MERGE of feat/image-reinjection into feat/scribe-in-right-panel: combines the \"Assistant\" ribbon tab (2026-07-06.4 — two explicit Inline/Side-panel buttons + Ctrl+Maj+I hints, native OO AI plugin hidden host-side) with the image re-injection chantier (2026-07-09.6 — save-fidelity fix: recalculate=true so the FromJSON+AddDrawing blip is transmitted to the co-editing/x2t save = <a:blip r:embed> + a word/media part; single undo via History.TurnOff/On; live render via blip=ret.url + insert-free warming). See .planning/phases/28-image-reinjection-plugin-only/ + debug/resolved/inject-blip-lost-at-save.md.";
  try { window.__scribeBuild = SCRIBE_BUILD; } catch (e) {}

  // ---- State ----
  var lastSelectedText = "";
  var lastSelectedHtml = "";
  var lastEnrichedMd = "";
  var lastTableDocIndices = [];
  var lastTableSnapshots = null;
  var lastTableAmbiguity = null;
  var lastPartialTableInfo = null;
  var imageCounter = 0;
  var footnoteCounter = 0;
  var crossRefCounter = 0;
  var lastCrossRefMeta = {};  // scribe-ref-N -> { type, screenTip, displayedText }
  var pendingIntents = {};
  var cozyOrigin = "*"; // TODO: restrict to actual Cozy origin in production

  // ---- Target window for postMessage ----
  // Cozy apps run inside an iframe from the Cozy Stack, so the frame hierarchy is:
  //   Cozy Stack (window.top) > Cozy Drive iframe > OO Editor iframe > Plugin iframe
  // CozyBridge listens on the Cozy Drive iframe window, which is window.parent.parent.
  // We post to all ancestor frames so the message reaches CozyBridge regardless of nesting.
  function postToAncestors(message) {
    var current = window.parent;
    while (current && current !== window) {
      try {
        current.postMessage(message, cozyOrigin);
      } catch (e) {
        // Cross-origin frame we can't post to — stop
        break;
      }
      if (current === current.parent) break;
      current = current.parent;
    }
  }

  // ---- Helper: log(msg) ----
  function log(msg) {
    console.log("[Scribe] " + msg);
  }

  // Announce the loaded build immediately (module load = code.js fetched & executed).
  log("build " + SCRIBE_BUILD);

  // ---- Helper: generateIntentId() ----
  function generateIntentId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Fallback: timestamp + random
    return "intent-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  // ---- castIntent: send an intent to Cozy Drive via postMessage ----
  // Per locked user decision: Promise-based API.
  // The plugin iframe (not callCommand) runs in a modern browser context
  // where Promise should be available. Fallback to callback-only if not.
  function castIntent(action, data, oneWay) {
    var intentId = generateIntentId();
    var message = {
      type: "cozy-bridge:intent",
      version: 1,
      intentId: intentId,
      action: action,
      source: "onlyoffice-plugin",
      data: data
    };

    postToAncestors(message);
    if (!oneWay) log("Intent cast: " + action);

    if (oneWay) return undefined;

    if (typeof Promise !== "undefined") {
      return new Promise(function(resolve, reject) {
        pendingIntents[intentId] = { action: action, resolve: resolve, reject: reject };
      });
    } else {
      log("Promise unavailable in sandbox -- using callback fallback");
      pendingIntents[intentId] = { action: action, resolve: null, reject: null };
      return undefined;
    }
  }

  // Build AI_TEXT_ASSISTANT intent data with optional HTML field (EXTR-02)
  function buildEditIntentData() {
    var data = { text: lastSelectedText };
    if (lastEnrichedMd && lastEnrichedMd.length > 0) {
      data.enrichedMd = lastEnrichedMd;
    }
    if (lastTableAmbiguity) {
      data.tableAmbiguity = lastTableAmbiguity;
    }
    if (lastPartialTableInfo) {
      data.partialTableInfo = lastPartialTableInfo;
    }
    if (lastTableSnapshots) {
      data.tableSnapshots = lastTableSnapshots;
    }
    return data;
  }

  // ---- Paste HTML with smart spacing ----
  // Prevents init() and polling from interfering during paste.
  var pasteInProgress = false;
  // Dormant floating-image fallback flag. When false (default), inline AND floating
  // (drawingType === "anchor") images are re-injected via the Api.FromJSON + AddDrawing
  // fast path (source-verified to preserve wrap/anchor — see 28-RESEARCH Risk 1). The
  // detection hook inside the injection callCommand routes anchor images to the old
  // PasteHtml mechanism ONLY if this is flipped true after a live floating-save check
  // (Plan 02 Q1). Ships false; the fallback path is intentionally not built beyond the hook.
  var FLOATING_FALLBACK = false;

  // Debounce for the selection-extraction triggered by OO on every selection
  // change (config initOnSelectionChanged:true). Running it on each change
  // interrupts OO's mouse-drag tracking (broke image resize/move via handles), so
  // we coalesce bursts of selection changes and extract only once they settle.
  var extractionDebounceTimer = null;
  var EXTRACTION_DEBOUNCE_MS = 250;
  // True while a mouse button is held in the editor (e.g. dragging an image handle
  // to resize/move). The extraction callCommand must NOT run during this — it
  // re-enters the editor and aborts OO's drag tracking (the image snaps back). We
  // suppress it on mousedown and run it once on mouseup (see handleEditorPointer*).
  var pointerDown = false;

  // ---- Register <u> underline extension for marked.lexer ----
  // Custom inline extension so marked tokenizes <u>...</u> into underline tokens
  // with recursive child token parsing for nested formatting (e.g. <u>**bold**</u>).
  if (window.marked && window.marked.use) {
    window.marked.use({
      extensions: [{
        name: "underline",
        level: "inline",
        start: function(src) {
          return src.indexOf("<u>");
        },
        tokenizer: function(src) {
          var match = src.match(/^<u>([\s\S]*?)<\/u>/);
          if (match) {
            var token = {
              type: "underline",
              raw: match[0],
              text: match[1],
              tokens: []
            };
            this.lexer.inlineTokens(match[1], token.tokens);
            return token;
          }
        },
        childTokens: ["tokens"],
        renderer: function(token) { return "<u>" + token.text + "</u>"; }
      }]
    });
  }

  // ---- flattenTokens: convert marked lexer output to flat paragraph+runs ----
  // Takes the array returned by marked.lexer(md) and produces:
  //   [{ type: "paragraph", runs: [{ text, bold, italic }] }]
  // Handles bold (strong), italic (em), nested formatting, and unknown block fallback.
  function flattenTokens(markedTokens) {
    var blocks = [];

    // Merge adjacent runs that share identical formatting into a single run.
    // The self-contained segment strategy produces one run per OO segment,
    // which can create adjacent runs with the same link URL or code style.
    // Merging here ensures the Builder API creates a single hyperlink/run
    // instead of multiple contiguous ones.
    function mergeAdjacentRuns(runs) {
      if (runs.length <= 1) return runs;
      var merged = [runs[0]];
      for (var i = 1; i < runs.length; i++) {
        var prev = merged[merged.length - 1];
        var cur = runs[i];
        // Skip special markers — never merge
        if (prev.imageMarker || cur.imageMarker || prev.footnoteMarker || cur.footnoteMarker || prev.crossRefMarker || cur.crossRefMarker) {
          merged.push(cur);
          continue;
        }
        // Merge if all formatting flags match
        if (prev.bold === cur.bold &&
            prev.italic === cur.italic &&
            prev.strikethrough === cur.strikethrough &&
            prev.underline === cur.underline &&
            prev.code === cur.code &&
            prev.link === cur.link) {
          prev.text += cur.text;
        } else {
          merged.push(cur);
        }
      }
      return merged;
    }

    function flattenInline(tokens, parentBold, parentItalic, parentStrikethrough, parentCode, parentLink, parentUnderline) {
      var runs = [];
      for (var i = 0; i < tokens.length; i++) {
        var tok = tokens[i];
        if (tok.type === "text") {
          // Check for footnote [^scribe-fn-N] or cross-ref {{REF:scribe-ref-N:text}} markers
          var markerRegex = /\[\^(scribe-fn-\d+)\]|\{\{REF:(scribe-ref-\d+):([^}]*)\}\}/g;
          if (tok.text && markerRegex.test(tok.text)) {
            markerRegex.lastIndex = 0;  // reset after test()
            var mMatch;
            var mLastIdx = 0;
            while ((mMatch = markerRegex.exec(tok.text)) !== null) {
              // Text before the marker
              if (mMatch.index > mLastIdx) {
                runs.push({ text: tok.text.substring(mLastIdx, mMatch.index), bold: !!parentBold, italic: !!parentItalic, strikethrough: !!parentStrikethrough, underline: !!parentUnderline, code: !!parentCode, link: parentLink || null });
              }
              // The marker run
              if (mMatch[1]) {
                runs.push({ text: "", footnoteMarker: mMatch[1], bold: false, italic: false, strikethrough: false, underline: false, code: false, link: null });
              } else if (mMatch[2]) {
                // mMatch[3] = visible text from LLM (may differ from original)
                runs.push({ text: "", crossRefMarker: mMatch[2], crossRefText: mMatch[3] || "", bold: false, italic: false, strikethrough: false, underline: false, code: false, link: null });
              }
              mLastIdx = markerRegex.lastIndex;
            }
            // Text after last marker
            if (mLastIdx < tok.text.length) {
              runs.push({ text: tok.text.substring(mLastIdx), bold: !!parentBold, italic: !!parentItalic, strikethrough: !!parentStrikethrough, underline: !!parentUnderline, code: !!parentCode, link: parentLink || null });
            }
          } else {
            runs.push({ text: tok.text, bold: !!parentBold, italic: !!parentItalic, strikethrough: !!parentStrikethrough, underline: !!parentUnderline, code: !!parentCode, link: parentLink || null });
          }
        } else if (tok.type === "strong") {
          runs = runs.concat(flattenInline(tok.tokens, true, parentItalic, parentStrikethrough, parentCode, parentLink, parentUnderline));
        } else if (tok.type === "em") {
          runs = runs.concat(flattenInline(tok.tokens, parentBold, true, parentStrikethrough, parentCode, parentLink, parentUnderline));
        } else if (tok.type === "del") {
          runs = runs.concat(flattenInline(tok.tokens, parentBold, parentItalic, true, parentCode, parentLink, parentUnderline));
        } else if (tok.type === "underline") {
          runs = runs.concat(flattenInline(tok.tokens, parentBold, parentItalic, parentStrikethrough, parentCode, parentLink, true));
        } else if (tok.type === "codespan") {
          runs.push({ text: tok.text, bold: !!parentBold, italic: !!parentItalic, strikethrough: !!parentStrikethrough, underline: !!parentUnderline, code: true, link: parentLink || null });
        } else if (tok.type === "link") {
          runs = runs.concat(flattenInline(tok.tokens || [], parentBold, parentItalic, parentStrikethrough, parentCode, tok.href, parentUnderline));
        } else if (tok.type === "image" && tok.text && tok.text.indexOf("IMG:scribe-img-") === 0) {
          runs.push({
            text: "",
            bold: false, italic: false, strikethrough: false, underline: false, code: false,
            link: null,
            imageMarker: tok.text.replace("IMG:", "")
          });
        } else if (tok.tokens) {
          runs = runs.concat(flattenInline(tok.tokens, parentBold, parentItalic, parentStrikethrough, parentCode, parentLink, parentUnderline));
        } else if (tok.text) {
          runs.push({ text: tok.text, bold: !!parentBold, italic: !!parentItalic, strikethrough: !!parentStrikethrough, underline: !!parentUnderline, code: !!parentCode, link: parentLink || null });
        }
      }
      return mergeAdjacentRuns(runs);
    }

    function flattenList(listToken, depth) {
      var items = listToken.items || [];
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        var itemTokens = item.tokens || [];
        var inlineTokens = [];
        var nestedLists = [];
        for (var m = 0; m < itemTokens.length; m++) {
          var sub = itemTokens[m];
          if (sub.type === "list") {
            nestedLists.push(sub);
          } else if (sub.type === "text" || sub.type === "paragraph") {
            inlineTokens = inlineTokens.concat(sub.tokens || []);
          }
        }
        if (inlineTokens.length > 0) {
          blocks.push({
            type: "list_item",
            ordered: !!listToken.ordered,
            level: depth,
            runs: flattenInline(inlineTokens, false, false, false, false, null, false)
          });
        }
        for (var n = 0; n < nestedLists.length; n++) {
          flattenList(nestedLists[n], depth + 1);
        }
      }
    }

    for (var i = 0; i < markedTokens.length; i++) {
      var block = markedTokens[i];
      if (block.type === "paragraph") {
        var pRuns = flattenInline(block.tokens || [], false, false, false, false, null, false);
        // Check if this paragraph is purely image markers (no text content)
        var hasTextContent = false;
        var imgMarkers = [];
        for (var pi = 0; pi < pRuns.length; pi++) {
          if (pRuns[pi].imageMarker) {
            imgMarkers.push(pRuns[pi].imageMarker);
          } else if (pRuns[pi].text && pRuns[pi].text.replace(/^\s+|\s+$/g, "").length > 0) {
            hasTextContent = true;
          }
        }
        if (!hasTextContent && imgMarkers.length > 0) {
          // Pure image paragraph -> promote to image_placeholder block(s)
          for (var ip = 0; ip < imgMarkers.length; ip++) {
            blocks.push({ type: "image_placeholder", name: imgMarkers[ip] });
          }
        } else {
          blocks.push({ type: "paragraph", runs: pRuns });
        }
      } else if (block.type === "heading") {
        blocks.push({
          type: "heading",
          depth: block.depth,
          runs: flattenInline(block.tokens || [], false, false, false, false, null, false)
        });
      } else if (block.type === "list") {
        flattenList(block, 0);
      } else if (block.type === "space") {
        // skip -- implicit paragraph separator
      } else if (block.type === "code") {
        // Fenced code block: split by newlines, each line = one code_block block
        var codeLines = (block.text || "").split("\n");
        for (var cl = 0; cl < codeLines.length; cl++) {
          blocks.push({
            type: "code_block",
            runs: [{ text: codeLines[cl] || " ", bold: false, italic: false, strikethrough: false, code: true, link: null }]
          });
        }
      } else if (block.type === "blockquote") {
        // Blockquote: recursively flatten inner tokens, tag each as blockquote
        var innerBlocks = flattenTokens(block.tokens || []);
        for (var bq = 0; bq < innerBlocks.length; bq++) {
          innerBlocks[bq].blockquote = true;
          blocks.push(innerBlocks[bq]);
        }
      } else if (block.type === "table") {
        // Markdown table: produce a single "table" block with header and rows of cells
        // Each cell contains flattened inline runs for formatting preservation
        var headerCells = [];
        var headerTokens = block.header || [];
        for (var hi = 0; hi < headerTokens.length; hi++) {
          headerCells.push({
            runs: flattenInline(headerTokens[hi].tokens || [], false, false, false, false, null, false)
          });
        }
        var bodyRows = [];
        var rowsArr = block.rows || [];
        for (var ri = 0; ri < rowsArr.length; ri++) {
          var rowCells = [];
          for (var ci = 0; ci < rowsArr[ri].length; ci++) {
            rowCells.push({
              runs: flattenInline(rowsArr[ri][ci].tokens || [], false, false, false, false, null, false)
            });
          }
          bodyRows.push(rowCells);
        }
        blocks.push({
          type: "table",
          header: headerCells,
          rows: bodyRows,
          align: block.align || []
        });
      } else if (block.tokens) {
        // Unknown block type with tokens: treat as paragraph fallback
        blocks.push({ type: "paragraph", runs: flattenInline(block.tokens || [], false, false, false, false, null, false) });
      } else if (block.text) {
        // Unknown block type with text only: treat as plain paragraph
        blocks.push({ type: "paragraph", runs: [{ text: block.text, bold: false, italic: false }] });
      }
    }

    return blocks;
  }


  // ---- Normalize list indentation before marked.lexer ----
  // LLMs (and our own extraction) indent nested list items by 2 spaces per level.
  // But CommonMark/marked only nests a child list when its indent reaches the
  // PARENT's content offset — which is the marker width: 2 for bullets ("- "),
  // but 3+ for ordered items ("1. "). So 2-space-indented ORDERED sub-lists do
  // NOT nest (probe-confirmed: marked flattens them all to level 0, and can even
  // drop deeper items). Fix: map each list item's raw indent to a logical level
  // via an indent stack (any consistent step → one level), then re-emit 4 spaces
  // per level — wide enough that marked nests ordered AND bullet lists at every
  // depth. Fenced code is left untouched; a column-0 non-list line ends the list
  // (stack reset). Single-line items only — wrapped continuation lines are rare
  // in LLM list output and pass through unchanged.
  function normalizeListIndent(md) {
    var lines = md.split("\n"), out = [], inFence = false, fenceCh = "", stack = [];
    var listRe = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
    var fenceRe = /^(\s*)(```+|~~~+)/;
    function rep(s, n) { var r = ""; for (var j = 0; j < n; j++) r += s; return r; }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], fm = line.match(fenceRe);
      if (fm) {
        if (!inFence) { inFence = true; fenceCh = fm[2].charAt(0); }
        else if (fm[2].charAt(0) === fenceCh) { inFence = false; }
        out.push(line); continue;
      }
      if (inFence) { out.push(line); continue; }
      var m = line.match(listRe);
      if (m) {
        var ind = m[1].length;
        while (stack.length && ind < stack[stack.length - 1]) stack.pop();
        if (!stack.length || ind > stack[stack.length - 1]) stack.push(ind);
        out.push(rep("    ", stack.length - 1) + m[2] + " " + m[4]);
      } else {
        if (line.replace(/\s+$/, "") === "") { out.push(line); } // blank: keep stack (loose lists)
        else { if (/^\S/.test(line)) stack = []; out.push(line); } // col-0 non-list ends the list
      }
    }
    return out.join("\n");
  }

  // ---- Collect scribe-img-* names referenced by a parsed response ----
  // Plugin-side scan of the flattened blocks + parsed table cells for the image
  // names the LLM response refers to. Used to drive the read-only ToJSON capture
  // pre-pass and the async getLocalImagePath media registration (see buildAndInject).
  // Order-preserving, de-duplicated.
  function collectReferencedImageNames(flat, parsedTables) {
    var names = [];
    var seen = {};
    function addName(n) {
      if (n && !seen[n]) { seen[n] = true; names.push(n); }
    }
    function scanBlocks(blocks) {
      if (!blocks) return;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (!b) continue;
        if (b.type === "image_placeholder" && b.name) addName(b.name);
        var runs = b.runs || [];
        for (var r = 0; r < runs.length; r++) {
          if (runs[r] && runs[r].imageMarker) addName(runs[r].imageMarker);
        }
      }
    }
    scanBlocks(flat);
    if (parsedTables) {
      for (var t = 0; t < parsedTables.length; t++) {
        var cells = parsedTables[t].cells || [];
        for (var c = 0; c < cells.length; c++) {
          var cellBlocks = cells[c].blocks || [{ runs: cells[c].runs || [] }];
          scanBlocks(cellBlocks);
        }
      }
    }
    return names;
  }

  // ---- Builder API injection with PasteHtml fallback ----
  // Tokenizes markdown via marked.lexer(), flattens to paragraph+runs,
  // passes through Asc.scope, and interprets as Builder API calls inside
  // a single callCommand (single undo point). Falls back to PasteHtml
  // if callCommand fails or times out.
  function buildAndInject(md, mode, fallbackHtml) {
    // Convert inline image markers to standard markdown image syntax
    // so marked.lexer() produces image tokens for both block and inline markers
    md = md.replace(/\{\{IMG:(scribe-img-\d+)\}\}/g, "![IMG:$1](placeholder)");
    // Normalize 2-space (LLM) list indentation to marked-nestable 4-space levels
    // BEFORE any tokenization (covers both the table-cell and main lexer paths).
    md = normalizeListIndent(md);
    // Keep visible text in cross-ref markers — the LLM may modify it (e.g. translation).
    // flattenInline will parse both the ref name and the visible text.

    // --- Table round-trip: parse TABLE:N blocks before marked.lexer ---
    // Backward compat: if md has bare CELL markers without TABLE wrappers,
    // wrap them in a single [TABLE:0]...[/TABLE] block first.
    if (/\[CELL:\d+,\d+\]/.test(md) && !/\[TABLE:\d+\]/.test(md)) {
      md = '[TABLE:0]\n' + md + '\n[/TABLE]';
    }

    var parsedTables = [];
    var tableBlockRegex = /\[TABLE:(\d+)\]([\s\S]*?)\[\/TABLE\]/g;
    var tableBlockMatch;
    while ((tableBlockMatch = tableBlockRegex.exec(md)) !== null) {
      var tableIndex = parseInt(tableBlockMatch[1]);
      var tableBody = tableBlockMatch[2];
      var cellRegex = /\[CELL:(\d+),(\d+)\]([\s\S]*?)\[\/CELL\]/g;
      var cellMatch;
      var tableCells = [];
      while ((cellMatch = cellRegex.exec(tableBody)) !== null) {
        var cellText = cellMatch[3];
        // Split cell text on \n\n boundaries to preserve empty paragraphs.
        // marked.lexer treats blank lines as separators (drops empty paragraphs),
        // so we split first and parse each segment individually.
        var cellSegments = cellText.split(/\n\n/);
        var cellBlocks = [];
        var cellRuns = [];
        for (var cs = 0; cs < cellSegments.length; cs++) {
          var seg = cellSegments[cs];
          if (seg.replace(/^\s+|\s+$/g, "").length === 0) {
            // Empty segment = empty paragraph
            cellBlocks.push({ type: "paragraph", runs: [] });
          } else {
            var segTokens = window.marked.lexer(seg);
            var segBlocks = flattenTokens(segTokens);
            for (var sb = 0; sb < segBlocks.length; sb++) {
              cellBlocks.push(segBlocks[sb]);
            }
          }
        }
        for (var cb = 0; cb < cellBlocks.length; cb++) {
          if (cellBlocks[cb].runs) {
            for (var cr = 0; cr < cellBlocks[cb].runs.length; cr++) {
              cellRuns.push(cellBlocks[cb].runs[cr]);
            }
          }
        }
        tableCells.push({
          r: parseInt(cellMatch[1]),
          c: parseInt(cellMatch[2]),
          runs: cellRuns,
          blocks: cellBlocks
        });
      }
      parsedTables.push({ index: tableIndex, cells: tableCells });
    }

    // Replace TABLE blocks in md with placeholder tokens that survive marked.lexer
    md = md.replace(/\[TABLE:\d+\][\s\S]*?\[\/TABLE\]\n?/g, function(match) {
      var indexMatch = match.match(/\[TABLE:(\d+)\]/);
      var idx = indexMatch ? indexMatch[1] : "0";
      return "SCRIBE-TABLE-" + idx + "\n";
    });

    var tokens = window.marked.lexer(md);
    var flat = flattenTokens(tokens);

    if (flat.length === 0 && parsedTables.length === 0) {
      log("No blocks parsed -- falling back to PasteHtml");
      if (fallbackHtml) { pasteHtml(fallbackHtml, mode); }
      return;
    }

    pasteInProgress = true;
    // Everything (text + images) is injected inside the single injection callCommand
    // below (images via FromJSON + AddDrawing from the pre-registered media map), which
    // is already ONE atomic history point. No undo-group is needed (OO 9.4's GroupActions
    // is a no-op stub; see 28-RESEARCH Pitfall 4). One Ctrl+Z reverts the whole reply
    // ONLY because the extraction's SetName("scribe-img-N") rename is wrapped in
    // History.TurnOff/On (see the extraction pass) so it adds no separate undo point —
    // otherwise an image Insert/Replace would take 2 undos. (Note: Start_SilentMode is
    // NOT the right lever — it gates recalc/interface events, not history; History.TurnOff
    // is what suppresses the undo record.)
    Asc.scope.tokens = JSON.stringify(flat);
    Asc.scope._mode = mode || "replace";
    Asc.scope.floatingFallback = FLOATING_FALLBACK;
    if (parsedTables.length > 0) {
      Asc.scope.parsedTables = JSON.stringify(parsedTables);
      Asc.scope.tableDocIndices = JSON.stringify(lastTableDocIndices);
      Asc.scope.tableSnapshots = lastTableSnapshots || null;
    } else {
      Asc.scope.parsedTables = null;
      Asc.scope.tableDocIndices = null;
      Asc.scope.tableSnapshots = null;
    }
    Asc.scope.partialTableInfo = lastPartialTableInfo ? JSON.stringify(lastPartialTableInfo) : null;
    // Pass cross-ref metadata for API recreation during injection
    Asc.scope.crossRefMeta = JSON.stringify(lastCrossRefMeta);
    // Detect mixed content: partial table + non-table blocks (paragraphs)
    // In Replace mode with mixed content, partial tables must use clone (not in-place)
    // because InsertContent replaces the entire selection including the table cells.
    var hasMixedContent = false;
    if (lastPartialTableInfo && parsedTables.length > 0) {
      for (var mi = 0; mi < flat.length; mi++) {
        // Check if this block is a SCRIBE-TABLE placeholder
        var miRuns = flat[mi].runs || [];
        var miText = "";
        for (var mj = 0; mj < miRuns.length; mj++) { miText += miRuns[mj].text || ""; }
        if (miText.indexOf("SCRIBE-TABLE-") === -1) { hasMixedContent = true; break; }
      }
    }
    Asc.scope.hasMixedContent = hasMixedContent;

    // Collect the scribe-img-* names referenced by the parsed response so the
    // read-only capture pre-pass (below) knows which drawings to serialize.
    var referencedImageNames = collectReferencedImageNames(flat, parsedTables);

    // The injection callCommand is wrapped in runInjection() so it can be deferred
    // until AFTER the async getLocalImagePath media pre-pass completes (barrier
    // below). All text + images land in this single callCommand = one undo point.
    function runInjection() {
    // Recalculate flag for the injection callCommand. When images are injected we MUST
    // pass recalculate=true: only then does OO run _afterEvalCommand -> Reassign_ImageUrls
    // (common/apiBase.js), which re-applies setBlipFill WITH history on each injected
    // drawing (Asc.editor.evalCommand is false by then), transmitting the
    // blipFill/rasterImageId as a co-editing change and calling
    // CollaborativeEditing.Add_NewImage(). Without it (recalculate=false) the
    // FromJSON+AddDrawing blip is set directly while evalCommand===true, so
    // CImageShape.setBlipFill SKIPS its CChangesImageIdStart/chunks/End history — the
    // injected media is never registered for the co-editing (x2t) save serializer, so the
    // saved .docx gets a degenerate <pic:blipFill> with NO <a:blip> and no word/media part
    // (renders live via our warm pass, lost on reopen). FromJSON still carries all
    // geometry (crop/rotation/extent/srcRect); Reassign_ImageUrls duplicates the blipFill
    // preserving that geometry and only re-registers the raster. See debug:
    // inject-blip-lost-at-save (root cause (c), CONFIRMED via 2026-07-09.5-diag).
    var scribeInjectRecalc = !!(referencedImageNames && referencedImageNames.length);
    var callbackFired = false;
    var fallbackTimer = setTimeout(function() {
      if (!callbackFired) {
        log("Builder callCommand timeout -- falling back to PasteHtml");
        pasteInProgress = false;
        if (fallbackHtml) { pasteHtml(fallbackHtml, mode); }
      }
    }, 5000);

    window.Asc.plugin.callCommand(function() {
      // callCommand bodies are serialized via toString() and re-run in the EDITOR
      // scope (see plugins.js: "(" + f.toString() + ")()") — module-level plugin
      // closures such as log() are NOT in scope here. Define a local log() so
      // diagnostics inside this callCommand reach the editor console instead of
      // throwing ReferenceError. This matters for robustness: the no-media skip in
      // injectDrawingInto logs OUTSIDE its try/catch, so a bare log() would abort
      // the whole injection exactly in the getLocalImagePath-failed case the 8s
      // barrier is meant to survive.
      function log(m) { if (typeof console !== "undefined" && console.log) console.log("[Scribe] " + m); }

      var tokensJson = Asc.scope.tokens;
      var mode = Asc.scope._mode;
      if (!tokensJson) return;

      var blocks = JSON.parse(tokensJson);
      var doc = Api.GetDocument();

      // [TEST HOOK — flag-gated, inert in prod] When a test selection spec is
      // queued (Asc.scope._testSelSpec, set ONLY by the injectAtSelection dev
      // hook), apply it HERE so it lives in the SAME callCommand that reads it —
      // a collapsed cursor set in a separate callCommand resets to offset 0.
      // One-shot: cleared immediately so later (real) injects never see it.
      var _testSelSpec = Asc.scope._testSelSpec;
      Asc.scope._testSelSpec = null;
      if (_testSelSpec) {
        try {
          var _tsp = JSON.parse(_testSelSpec);
          var _ttgt = null;
          // Cross-boundary (T4/T5/T6) — twin of hookSetSelection's cross branch.
          // Multi-¶ top-level (A5/A6) also rides this branch (both ends ¶, diff ¶).
          var _tCross = (!!_tsp.startCell !== !!_tsp.endCell) || (_tsp.startCell && _tsp.endCell && _tsp.startN !== _tsp.endN) || (!_tsp.startCell && !_tsp.endCell && _tsp.startN !== _tsp.endN);
          var _tIsRange = _tsp.full || (_tsp.startCell && _tsp.endCell && (_tsp.startCell.r !== _tsp.endCell.r || _tsp.startCell.c !== _tsp.endCell.c));
          if (_tCross) {
            var _txNth = function(kind, nn) {
              var c = doc.GetElementsCount(), s = 0;
              for (var i = 0; i < c; i++) { var e = doc.GetElement(i); if (e.GetClassType && e.GetClassType() === kind) { s++; if (s === nn) return e; } }
              return null;
            };
            var _txParaRange = function(para, kind) {
              var txt = (para.GetText ? para.GetText() : "").replace(/[\r\n]+$/, ""), len = txt.length, off;
              if (/^\d+$/.test(kind)) { off = parseInt(kind, 10); if (off > len) off = len; }
              else if (kind === "end") off = len;
              else if (kind === "mid") off = Math.floor(len / 2);
              else if (kind === "space") { var ix = txt.indexOf(" "); off = ix >= 0 ? ix + 1 : 0; }
              else off = 0;
              var cnt = para.GetElementsCount ? para.GetElementsCount() : 0, acc = 0;
              for (var i = 0; i < cnt; i++) {
                var el = para.GetElement(i), ct = el.GetClassType ? el.GetClassType() : "";
                if (ct !== "run" && ct !== "hyperlink") continue;
                var t = (el.GetText ? el.GetText() : "").replace(/[\r\n]+$/, "");
                if (off <= acc + t.length) return el.GetRange ? el.GetRange(off - acc, off - acc) : null;
                acc += t.length;
              }
              return para.GetRange ? para.GetRange() : null;
            };
            var _txEndpoint = function(nn, kind, cell, isStart) {
              if (!cell) { var pp = _txNth("paragraph", nn); return pp ? _txParaRange(pp, kind) : null; }
              var tb = _txNth("table", nn); if (!tb) return null;
              var cl = tb.GetCell(cell.r, cell.c); if (!cl) return null;
              var cc = cl.GetContent(), pe = isStart ? cc.GetElement(0) : cc.GetElement(cc.GetElementsCount() - 1);
              return pe && pe.GetRange ? pe.GetRange() : null;
            };
            var _txsr = _txEndpoint(_tsp.startN, _tsp.startKind, _tsp.startCell, true);
            var _txer = _txEndpoint(_tsp.endN, _tsp.endKind, _tsp.endCell, false);
            var _txrng = (_txsr && _txer && _txsr.ExpandTo) ? _txsr.ExpandTo(_txer) : null;
            if (_txrng && _txrng.Select) _txrng.Select();
          } else if (_tIsRange) {
            // Multi-cell range (T2a/b/c) or whole table (T3) — twin of hookSetSelection.
            var _rtc = doc.GetElementsCount(), _rts = 0, _rtb = null;
            for (var _rti = 0; _rti < _rtc; _rti++) {
              var _rte = doc.GetElement(_rti);
              if (_rte.GetClassType && _rte.GetClassType() === "table") { _rts++; if (_rts === _tsp.startN) { _rtb = _rte; break; } }
            }
            if (_rtb) {
              var _rsc, _rec;
              if (_tsp.full) {
                _rsc = _rtb.GetCell(0, 0);
                var _rlr = _rtb.GetRowsCount() - 1;
                _rec = _rtb.GetCell(_rlr, _rtb.GetRow(_rlr).GetCellsCount() - 1);
              } else {
                _rsc = _rtb.GetCell(_tsp.startCell.r, _tsp.startCell.c);
                _rec = _rtb.GetCell(_tsp.endCell.r, _tsp.endCell.c);
              }
              if (_rsc && _rec) {
                var _rscC = _rsc.GetContent(), _recC = _rec.GetContent();
                var _rsp = _rscC.GetElement(0), _rep = _recC.GetElement(_recC.GetElementsCount() - 1);
                var _rsr = _rsp && _rsp.GetRange ? _rsp.GetRange() : null;
                var _rer = _rep && _rep.GetRange ? _rep.GetRange() : null;
                var _rrng = (_rsr && _rer && _rsr.ExpandTo) ? _rsr.ExpandTo(_rer) : (_rsr || _rer);
                if (_rrng && _rrng.Select) _rrng.Select();
              }
            }
          } else {
          var _tEndTgt = null; // end ¶ for multi-¶ intra-cell (A5/A6); else same as _ttgt
          if (_tsp.startCell) {
            // intra-cell: n-th TABLE → cell (r,c) → start ¶ (startPara, default 1) and
            // end ¶ (endPara, default 1). Different paras ⇒ multi-¶ intra-cell selection.
            var _tcc = doc.GetElementsCount(), _tsn = 0, _tbl = null;
            for (var _ti = 0; _ti < _tcc; _ti++) {
              var _tel = doc.GetElement(_ti);
              if (_tel.GetClassType && _tel.GetClassType() === "table") { _tsn++; if (_tsn === _tsp.startN) { _tbl = _tel; break; } }
            }
            if (_tbl) {
              try {
                var _tcont = _tbl.GetCell(_tsp.startCell.r, _tsp.startCell.c).GetContent();
                _ttgt = _tcont.GetElement((_tsp.startPara || 1) - 1);
                _tEndTgt = _tcont.GetElement((_tsp.endPara || 1) - 1);
              } catch (e) {}
            }
          } else {
            var _tcnt = doc.GetElementsCount(), _tseen = 0;
            for (var _tj = 0; _tj < _tcnt; _tj++) {
              var _tel2 = doc.GetElement(_tj);
              if (_tel2.GetClassType && _tel2.GetClassType() === "paragraph") { _tseen++; if (_tseen === _tsp.startN) { _ttgt = _tel2; break; } }
            }
            _tEndTgt = _ttgt;
          }
          if (_ttgt) {
            // Offset within a GIVEN ¶ from its own text (strip ¶ mark + cell \t so
            // @end doesn't overshoot the run text → _tat() fallback to offset 0).
            var _offIn = function(paraEl, k) {
              var _txt = (paraEl && paraEl.GetText ? paraEl.GetText() : "").replace(/[\r\n\t]+$/, ""), _ln = _txt.length;
              if (/^\d+$/.test(k)) { var _n = parseInt(k, 10); return _n > _ln ? _ln : _n; }
              if (k === "end") return _ln;
              if (k === "mid") return Math.floor(_ln / 2);
              if (k === "space") { var _ix = _txt.indexOf(" "); return _ix >= 0 ? _ix + 1 : 0; }
              return 0;
            };
            var _tat = function(para, off) {
              var _c = para.GetElementsCount ? para.GetElementsCount() : 0, _a = 0;
              for (var _i = 0; _i < _c; _i++) {
                var _e2 = para.GetElement(_i);
                var _ct = _e2.GetClassType ? _e2.GetClassType() : "";
                if (_ct !== "run" && _ct !== "hyperlink") continue;
                var _t2 = (_e2.GetText ? _e2.GetText() : "").replace(/[\r\n]+$/, "");
                if (off <= _a + _t2.length) return _e2.GetRange ? _e2.GetRange(off - _a, off - _a) : null;
                _a += _t2.length;
              }
              return null;
            };
            var _trng = null;
            if (_tEndTgt && _tEndTgt !== _ttgt) {
              // MULTI-¶ intra-cell (A5/A6): ExpandTo the two per-¶ collapsed offsets.
              var _mrA = _tat(_ttgt, _offIn(_ttgt, _tsp.startKind));
              var _mrB = _tat(_tEndTgt, _offIn(_tEndTgt, _tsp.endKind));
              _trng = (_mrA && _mrB && _mrA.ExpandTo) ? _mrA.ExpandTo(_mrB) : (_mrA || _mrB);
            } else {
              // SINGLE ¶ (A0-A4 intra-cell + intra-¶ top-level) — unchanged behaviour.
              var _ttxt = (_ttgt.GetText ? _ttgt.GetText() : "").replace(/[\r\n\t]+$/, "");
              var _tlen = _ttxt.length;
              var _ts = _offIn(_ttgt, _tsp.startKind), _te = _offIn(_ttgt, _tsp.endKind);
              if (_ts === 0 && _te === _tlen) _trng = _ttgt.GetRange ? _ttgt.GetRange() : null;
              else if (_ts === _te) _trng = _tat(_ttgt, _ts) || (_ttgt.GetRange ? _ttgt.GetRange(0, 0) : null);
              else { var _ra = _tat(_ttgt, _ts), _rb = _tat(_ttgt, _te); _trng = (_ra && _rb && _ra.ExpandTo) ? _ra.ExpandTo(_rb) : (_ra || _rb); }
            }
            if (_trng && _trng.Select) _trng.Select();
          }
          }
        } catch (e) {}
      }

      // Read paragraph-level font style at insertion point
      // Uses paragraph mark text properties (base style, ignoring local run overrides)
      // Falls back to document default text properties
      var srcFontFamily = null;
      var srcFontSize = null;
      var hostStyle = null; // §5bis: ¶ style of the host at the insertion point —
                            // both halves of a block split must keep it.
      var firstBlockStyled = false;  // §5bis Cas B: 1st injected block has its own
                                     // md style (heading/list/quote/code) → must NOT
                                     // merge inline; host keeps its own style.
      var leadSpacerInserted = false; // §5bis Cas B: a host-styled empty spacer was
                                      // unshifted into content[] to absorb OO's merge.
      var firstParaMergedInline = false; // §5bis A6 (post-sel): the 1st injected block
                                         // is plain and MERGES into the host prefix (Cas A).
                                         // The block-insert post-selection must then start
                                         // at the merge junction (preSelStart), NOT at the
                                         // merged paragraph's offset 0 (which would cover the
                                         // surviving host prefix — the A6-postsel bug).
      try {
        var selRange = doc.GetRangeBySelect();
        if (selRange) {
          var para = selRange.GetParagraph();
          if (para) {
            var textPr = para.GetTextPr();
            if (textPr) {
              srcFontFamily = textPr.GetFontFamily();
              srcFontSize = textPr.GetFontSize();
            }
            if (para.GetStyle) hostStyle = para.GetStyle();
          }
        }
      } catch (e) {
        // Reading failed — try document default
      }
      if (!srcFontFamily || !srcFontSize) {
        try {
          var defaultPr = doc.GetDefaultTextPr();
          if (defaultPr) {
            if (!srcFontFamily) srcFontFamily = defaultPr.GetFontFamily();
            if (!srcFontSize) srcFontSize = defaultPr.GetFontSize();
          }
        } catch (e) {
          // No default available — runs will use OO built-in default
        }
      }
      // Robust host ¶ style: GetRangeBySelect().GetParagraph() is unreliable for a
      // COLLAPSED cursor, so find the host paragraph by iterating to the element whose
      // range covers the selection start position (same technique as smart spacing).
      try {
        var hsSel = doc.GetRangeBySelect();
        if (hsSel) {
          var hsStart = hsSel.GetStartPos();
          var hsCount = doc.GetElementsCount();
          for (var hsi = 0; hsi < hsCount; hsi++) {
            var hsEl = doc.GetElement(hsi);
            if (!hsEl.GetClassType || hsEl.GetClassType() !== "paragraph") continue;
            var hsR = hsEl.GetRange ? hsEl.GetRange() : null;
            if (hsR && hsStart >= hsR.GetStartPos() && hsStart <= hsR.GetEndPos()) {
              if (hsEl.GetStyle) hostStyle = hsEl.GetStyle();
              break;
            }
          }
        }
      } catch (e) {}

      // ---- Smart spacing detection ----
      // Mirrors the pasteHtml spacing pattern (lines 378-416) but for Builder API.
      // Detects adjacent non-whitespace chars around the selection/cursor and sets
      // flags to inject space runs at content boundaries.
      var needSpaceBefore = false;
      var needSpaceAfter = false;
      // \u00A75bis r\u00E8gle d'insertion (2026-07-16, UAT Ben) : quand le point de collage est
      // au BORD d'un \u00B6 non-vide (curseur en fin de \u00B6 \u2192 s\u00E9lection couvrant des \u00B6 entiers),
      // le contenu inject\u00E9 devient un NOUVEAU \u00B6 au lieu d'\u00EAtre fusionn\u00E9 inline en fin de
      // ligne (bug A1/A5). Au MILIEU d'un \u00B6, on garde la fusion inline. Cf REVIEW-BACKLOG.
      var insCaretAtEnd = false;
      var WS = /[\s\n\r\t\u00A0]/;

      // Find the host paragraph whose range covers `pos`, searching BOTH top-level
      // elements AND table-cell paragraphs (T-r\u00E8gles-intra V2). The old inline search
      // only iterated doc.GetElement (top-level), so for a cursor inside a cell it
      // returned null \u2192 the smart-spacing / insCaretAtEnd / hostStyle logic was skipped
      // \u2192 intra-cell injects lost spacing and the \u00B6-edge\u2192new-\u00B6 rule. Returns
      // { para, start } or null. Positions within a single paragraph compose reliably,
      // so the caller can GetRange(start, pos) inside the returned paragraph.
      function findHostParaAt(pos) {
        var n = doc.GetElementsCount();
        for (var hi = 0; hi < n; hi++) {
          var hel = doc.GetElement(hi);
          var hct = hel.GetClassType ? hel.GetClassType() : "";
          if (hct === "paragraph") {
            var hr = hel.GetRange ? hel.GetRange() : null;
            if (hr && pos >= hr.GetStartPos() && pos <= hr.GetEndPos()) return { para: hel, start: hr.GetStartPos() };
          } else if (hct === "table") {
            try {
              var hrc = hel.GetRowsCount ? hel.GetRowsCount() : 0;
              for (var hr2 = 0; hr2 < hrc; hr2++) {
                var hrow = hel.GetRow(hr2);
                var hcc = hrow && hrow.GetCellsCount ? hrow.GetCellsCount() : 0;
                for (var hc = 0; hc < hcc; hc++) {
                  var hcell = hel.GetCell(hr2, hc);
                  var hcont = hcell && hcell.GetContent ? hcell.GetContent() : null;
                  if (!hcont) continue;
                  var hpn = hcont.GetElementsCount ? hcont.GetElementsCount() : 0;
                  for (var hpi = 0; hpi < hpn; hpi++) {
                    var hcp = hcont.GetElement(hpi);
                    if (!hcp || !hcp.GetClassType || hcp.GetClassType() !== "paragraph") continue;
                    var hcr = hcp.GetRange ? hcp.GetRange() : null;
                    if (hcr && pos >= hcr.GetStartPos() && pos <= hcr.GetEndPos()) return { para: hcp, start: hcr.GetStartPos() };
                  }
                }
              }
            } catch (eHost) {}
          }
        }
        return null;
      }

      // Insert mode (\u00A75bis): SYMMETRIC spacing \u2014 add a space before/after the
      // inserted runs only when the adjacent char is non-whitespace, never doubled.
      // OO document positions are ELEMENT units (not chars), so reading the char
      // before/after via doc.GetRange(pos\u00B1n) breaks at a paragraph boundary (the \u00B6
      // mark gets mistaken for the neighbour char). Instead compute the char OFFSET
      // inside the host paragraph from the text length of [paraStart..cursor]
      // (GetText resolves real chars), then index the paragraph text directly.
      if (mode === "insert") {
        var insSelRange = doc.GetRangeBySelect();
        if (insSelRange) {
          var insPos = insSelRange.GetEndPos();
          // Find the HOST paragraph by iteration (GetRangeBySelect().GetParagraph()
          // is unreliable for collapsed cursors) — the element whose range covers
          // insPos. Then compute the cursor's CHAR offset inside it (text length of
          // [hostStart..cursor], GetText resolves real chars) and read the char
          // before/after directly from the paragraph text. aChar = "" at end-of-
          // paragraph → no trailing space (the previous range-based read leaked into
          // the NEXT paragraph and wrongly added a space at @end).
          // Cell-aware host search (V2): also descends into table cells, so an
          // insertion inside a cell finds its host ¶ (not null) → spacing + ¶-edge rule
          // apply intra-cell too.
          var hostHit = findHostParaAt(insPos);
          var hostPara = hostHit ? hostHit.para : null, hostStart = hostHit ? hostHit.start : -1;
          // Insert host ¶ = the one at the insertion point (selection END). hostStyle
          // was seeded from the selection START (§5bis, lines ~701-716); for a multi-¶
          // selection that is the WRONG paragraph — e.g. select H1+H2 and Insert: the
          // host is the H2, not the H1. Without this override the Cas B spacer (or the
          // Cas A first-¶) carries the START style and OO stamps it onto the host's
          // left split half, bumping the last selected ¶ to the first's heading level.
          if (hostPara && hostPara.GetStyle) hostStyle = hostPara.GetStyle();
          if (hostPara) {
            // Strip trailing ¶ mark (\r\n) AND the cell-terminator \t: a cell's LAST
            // paragraph reports "text\t" from GetText, so without stripping the \t the
            // @end offset overshoots the run text → the caret falls back to offset 0
            // (XXX lands at the cell start). Treat the cell \t like a ¶ boundary.
            var hpText = (hostPara.GetText ? hostPara.GetText() : "").replace(/[\r\n\t]+$/, "");
            var prefR = doc.GetRange(hostStart, insPos);
            var pref = prefR ? (prefR.GetText() || "").replace(/[\r\n\t]+$/, "") : "";
            var off = pref.length;
            var bChar = off > 0 ? hpText.charAt(off - 1) : "";
            var aChar = off < hpText.length ? hpText.charAt(off) : "";
            if (bChar && !WS.test(bChar)) needSpaceBefore = true;
            if (aChar && !WS.test(aChar)) needSpaceAfter = true;
            // Caret at the END of a non-empty host ¶ = a paragraph boundary → the
            // injected content must start on a NEW ¶ (not glue to the sentence).
            // Empty host ¶ (off===len===0) is EXCLUDED so an insert into a blank ¶
            // still fills it inline (A7). @start (off===0, len>0) is left untouched.
            insCaretAtEnd = (hpText.length > 0 && off === hpText.length);
            // New-¶ insertion: the ¶ break IS the separator → no leading space run
            // (otherwise the new ¶ starts with a spurious " XXX").
            if (insCaretAtEnd) needSpaceBefore = false;
          }
          // Collapse the cursor to the insertion point (end of the selection).
          // Top-level: keep the document-absolute doc.GetRange(insPos,insPos) — it is
          // exact there and the A0–A6 selection goldens depend on it (a paragraph-
          // relative collapse shifts the inline sentinel selection by +2). INTRA-CELL:
          // an absolute doc.GetRange does NOT compose across the cell boundary (L#2) —
          // it collapses to offset 0 and the insert lands at the cell start
          // ("XXXAlpha"). There, build the collapsed range from the host ¶ itself
          // (paragraph-relative offset), which is reliable inside a cell.
          var hostCell = hostPara && hostPara.GetParentTableCell ? hostPara.GetParentTableCell() : null;
          var collapseRange = null;
          if (hostCell && hostPara && typeof off === "number" && hostPara.GetRange) {
            collapseRange = hostPara.GetRange(off, off);
          }
          if (!collapseRange) collapseRange = doc.GetRange(insPos, insPos);
          if (collapseRange) collapseRange.Select();
        }
      }

      try {
        if (mode === "insert") {
          // Insert mode: spacing handled by paragraph separators, not space runs
        } else {
          // Replace mode: check char before selection start and after selection end
          var repRange = doc.GetRangeBySelect();
          if (repRange) {
            // §5bis: read the neighbour char CLAMPED to its host paragraph, so a ¶
            // boundary counts as a newline (blank → no space), exactly like the
            // insert branch above. The old doc.GetRange(repEnd, repEnd+5) read
            // leaked across the ¶ mark into the NEXT paragraph and added a spurious
            // trailing space when the whole host ¶ was selected (A1/replace: the
            // selection end lands at the paragraph's GetEndPos, whose forward read
            // returns the next paragraph's first word). Clamping fixes it: at
            // end-of-¶ the within-paragraph char is "" → no space.
            // Cell-aware host lookup (same as the insert branch): findHostParaAt
            // descends into table cells, so replace-mode smart spacing works INTRA-CELL
            // too. The old inline loop scanned only doc.GetElement (top-level) → in a
            // cell it returned null → no needSpaceBefore/After → "The quickXXX" /
            // "XXXquick" (missing paste-space on a replace). Strip the cell-terminator
            // \t as well as the ¶ mark.
            var hostAt = function(pos) {
              var hit = findHostParaAt(pos);
              if (!hit) return null;
              var pel = hit.para;
              var ptext = (pel.GetText ? pel.GetText() : "").replace(/[\r\n\t]+$/, "");
              var pfR = doc.GetRange(hit.start, pos);
              var pf = pfR ? (pfR.GetText() || "").replace(/[\r\n\t]+$/, "") : "";
              return { text: ptext, off: pf.length };
            };
            var hB = hostAt(repRange.GetStartPos());
            if (hB) {
              var bc = hB.off > 0 ? hB.text.charAt(hB.off - 1) : "";
              if (bc && !WS.test(bc)) needSpaceBefore = true;
            }
            var hA = hostAt(repRange.GetEndPos());
            if (hA) {
              var ac = hA.off < hA.text.length ? hA.text.charAt(hA.off) : "";
              if (ac && !WS.test(ac)) needSpaceAfter = true;
            }
          }
        } // end else (replace mode)
      } catch (e) {
        // Spacing detection failed -- proceed without spacing (safe fallback)
      }

      // §5bis Cas B: when the 1st injected block carries its own paragraph style
      // (heading / list / quote / code), the whole insert goes BLOCK (separate ¶s
      // via the host-styled spacer, see prepareFirstBlockForMerge). Every injected
      // block is then bounded by ¶ marks on BOTH sides, and "bord de ¶ = saut de
      // ligne" (= blank) → NO space run must be added. Suppress smart spacing so the
      // styled block stays clean ("Injected", not " Injected"). Test inlined (the
      // blockHasParaStyle helper is declared later, inside the content>0 block, so
      // it isn't assigned yet here).
      var firstInjBlock = blocks[0];
      var firstInjBlockStyled = !!firstInjBlock && (
        firstInjBlock.type === "heading" ||
        firstInjBlock.type === "list_item" ||
        firstInjBlock.type === "code_block" ||
        (firstInjBlock.type === "paragraph" && firstInjBlock.blockquote)
      );
      if (firstInjBlockStyled) {
        needSpaceBefore = false;
        needSpaceAfter = false;
      }

      // Pre-scan: create numbering objects once if needed
      var bulletNumbering = null;
      var orderedNumbering = null;
      var hasBullets = false;
      var hasOrdered = false;
      for (var ii = 0; ii < blocks.length; ii++) {
        if (blocks[ii].type === "list_item") {
          if (blocks[ii].ordered) hasOrdered = true;
          else hasBullets = true;
        }
      }
      if (hasBullets) bulletNumbering = doc.CreateNumbering("bullet");
      if (hasOrdered) orderedNumbering = doc.CreateNumbering("numbered");

      // Pre-scan: detect a quote/citation style from document's predefined styles.
      // OOXML (and OO) typically include styles like "Quote", "Intense Quote",
      // or locale variants. We search by heuristic on the style name.
      var quoteStyle = null;
      var hasBlockquotes = false;
      for (var bqi = 0; bqi < blocks.length; bqi++) {
        if (blocks[bqi].blockquote) { hasBlockquotes = true; break; }
      }
      if (hasBlockquotes) {
        // Try well-known names first (most OO documents have these)
        var knownQuoteNames = ["Intense Quote", "Citation intense", "Quote", "Citation"];
        for (var qn = 0; qn < knownQuoteNames.length; qn++) {
          var candidate = doc.GetStyle(knownQuoteNames[qn]);
          if (candidate) { quoteStyle = candidate; break; }
        }
        // Fallback: enumerate all styles looking for quote/citation keywords
        if (!quoteStyle) {
          try {
            var allStyles = doc.GetAllStyles();
            if (allStyles) {
              var quotePatterns = ["quote", "citation", "cita", "blockquote", "bloc de citation"];
              for (var si = 0; si < allStyles.length; si++) {
                var sName = "";
                try { sName = allStyles[si].GetName(); } catch (e) { continue; }
                var sLower = sName.toLowerCase();
                for (var qp = 0; qp < quotePatterns.length; qp++) {
                  if (sLower.indexOf(quotePatterns[qp]) !== -1) {
                    quoteStyle = allStyles[si];
                    break;
                  }
                }
                if (quoteStyle) break;
              }
            }
          } catch (e) {
            // GetAllStyles not available — keep quoteStyle null, fallback to indent
          }
        }
      }

      // --- Image re-injection via Api.FromJSON + AddDrawing (plugin-only) ---
      // The media pre-pass (buildAndInject) already: (1) captured each referenced
      // image's FULL drawing ToJSON before this callCommand, and (2) registered its
      // media via getLocalImagePath — which UPLOADS a server-fetchable source (see
      // imageSpecFor) so the doc server creates a BYTE-BACKED media part and returns its
      // id (ret.url). That name -> { json, rasterId } map arrives here through
      // Asc.scope.imageMediaMap.
      // For each insertion we set the blip rasterImageId to entry.rasterId (the
      // byte-backed uploaded media id): it renders live (getFullImageSrc2 resolves it)
      // AND embeds at co-editing save (x2t has the bytes -> <a:blip r:embed> +
      // word/media part). Api.FromJSON then rebuilds a COMPLETE drawing (crop/rotation/
      // flip/wrap/anchor/effects/alt-text preserved) and AddDrawing inserts it — all
      // inside this single injection callCommand. The render cache is warmed for the
      // media id at the end so it also paints live in-session.
      var imageMediaMap = {};
      try { imageMediaMap = JSON.parse(Asc.scope.imageMediaMap || "{}") || {}; } catch (e) { imageMediaMap = {}; }
      var floatingFallback = !!Asc.scope.floatingFallback;
      // Blip rasterImageIds (byte-backed media ids) of images actually injected this
      // pass. Nothing here loads the bitmap into the render cache, so injected drawings
      // paint blank until reload; we warm the cache for these ids at the END of this
      // callCommand (see below).
      var scribeInjectedRasterIds = [];

      // Insert image `name` into `target` (a paragraph or run) via FromJSON+AddDrawing.
      // Returns true if a drawing was inserted, false otherwise (unknown/failed image).
      // Never injects an empty rasterImageId: a failed getLocalImagePath (recorded
      // without a rasterId in the pre-pass) is skipped with a log (Pitfall 1).
      function injectDrawingInto(target, name) {
        var entry = imageMediaMap[name];
        if (!entry || !entry.rasterId || entry.failed) {
          log("Scribe: skipping image " + name + " (no registered media path)");
          return false;
        }
        try {
          var j = JSON.parse(entry.json);
          if (!j || !j.graphic || !j.graphic.blipFill) {
            log("Scribe: image " + name + " has no blipFill in captured JSON");
            return false;
          }
          // Set the injected blip to the byte-BACKED uploaded media id
          // (entry.rasterId = getLocalImagePath ret.url = imagePath2Local of the media
          // part that sendImgUrls just created on the doc server, with REAL bytes — see
          // imageSpecFor's fetchable-source pre-pass). This id renders live
          // (getFullImageSrc2 resolves the "media/"-prefixed id to the registered URL).
          // It embeds at co-editing SAVE only because the injection callCommand runs with
          // recalculate=TRUE (scribeInjectRecalc, ~l.590): that re-applies setBlipFill
          // WITH history so the blipFill change is transmitted to x2t, which then writes
          // <a:blip r:embed> + a word/media part. The rasterId FORM is NOT what fixed the
          // save: builds .3 (keep the ToJSON data-URL) and .4 (resolve to a fetchable http
          // URL) BOTH failed the save oracle identically — the .5-diag build proved the
          // source WAS a real data-URL AND the server HELD the bytes (getLocalImagePath
          // error:false, fresh hash media id), yet the save stayed degenerate. The true
          // fix was the co-editing TRANSMISSION (recalculate=true), not the id form
          // (see debug: inject-blip-lost-at-save, Eliminated + root cause (c)).
          var blipRasterId = entry.rasterId;
          j.graphic.blipFill.rasterImageId = blipRasterId;
          // Floating-image detection hook: drawingType === "anchor" => floating image.
          // Both inline and floating go through the FromJSON fast path by default; the
          // dormant fallback (floatingFallback flag) is intentionally not built beyond
          // this hook (see 28-RESEARCH Risk 1 / Plan 02 Q1).
          var isAnchor = (j.drawingType === "anchor");
          if (floatingFallback && isAnchor) {
            log("Scribe: floating image " + name + " — PasteHtml fallback flag set but path not built; using FromJSON");
          }
          // Fresh Api.FromJSON per insertion — AddDrawing binds it into the document,
          // so one ApiDrawing must not be reused across two AddDrawing calls (Pitfall 2).
          var apiDrawing = Api.FromJSON(JSON.stringify(j));
          if (apiDrawing && target && target.AddDrawing) {
            target.AddDrawing(apiDrawing);
            // Remember the rasterImageId (the byte-backed media id we injected) so we
            // can warm the render cache post-inject — getFullImageSrc2(rasterId)
            // resolves the "media/"-prefixed id to the registered doc-server URL.
            if (blipRasterId) scribeInjectedRasterIds.push(blipRasterId);
            return true;
          }
          log("Scribe: FromJSON produced no drawing for " + name);
          return false;
        } catch (e) {
          log("Scribe: FromJSON injection failed for " + name + ": " + e);
          return false;
        }
      }

      // --- Footnote round-trip: save content text, recreate after InsertContent ---
      // Footnote calls appear as runs with style "footnote reference" and empty text.
      // Copy() on these runs does NOT preserve the internal footnote link.
      // Strategy: save footnote content text before InsertContent destroys it,
      // then use doc.AddFootnote() post-InsertContent to recreate.
      // Save all footnote content texts (indexed by document order).
      var footnoteContentTexts = [];
      try {
        var fnParas = doc.GetFootnotesFirstParagraphs();
        if (fnParas) {
          for (var fpi = 0; fpi < fnParas.length; fpi++) {
            var fnText = fnParas[fpi].GetText ? fnParas[fpi].GetText() : "";
            footnoteContentTexts.push(fnText.replace(/[\r\n]+$/, ""));
          }
        }
      } catch (e) {}
      var pendingFootnotes = [];  // [{para, markerName, markerText}] — processed post-InsertContent

      // --- Cross-reference round-trip: recreate via API ---
      // Cross-refs cannot be Copy()-ed (hyperlinks lack Copy method).
      // Instead, use AddHeadingCrossRef/AddBookmarkCrossRef AFTER InsertContent
      // (these API methods require the paragraph to be in the document).
      var crossRefMeta = {};
      try { crossRefMeta = JSON.parse(Asc.scope.crossRefMeta || "{}"); } catch (e) {}

      // Helper: find a bookmark name matching a screenTip (handles space/underscore mismatch).
      // OO screenTip uses spaces ("un signet") but bookmark names use underscores ("un_signet").
      function findBookmarkName(screenTip) {
        var bmNames = doc.GetAllBookmarksNames();
        if (!bmNames) return null;
        for (var bi = 0; bi < bmNames.length; bi++) {
          if (bmNames[bi] === screenTip) return bmNames[bi];
        }
        var normalized = screenTip.replace(/\s+/g, "_");
        for (var bi2 = 0; bi2 < bmNames.length; bi2++) {
          if (bmNames[bi2] === normalized) return bmNames[bi2];
          if (bmNames[bi2].replace(/_/g, " ") === screenTip) return bmNames[bi2];
        }
        return null;
      }

      // Post-InsertContent: recreate footnotes at placeholder positions.
      // Uses doc.AddFootnote() which inserts a footnote at the current selection,
      // then fills it with the saved footnote content text.
      function processPendingFootnotes() {
        for (var pfi = 0; pfi < pendingFootnotes.length; pfi++) {
          var pfr = pendingFootnotes[pfi];
          var para = pfr.para;
          try {
            // Find the placeholder run and select its range
            var pfCount = para.GetElementsCount();
            for (var pfe = 0; pfe < pfCount; pfe++) {
              var pfEl = para.GetElement(pfe);
              var pfText = pfEl.GetText ? pfEl.GetText() : "";
              if (pfText !== pfr.markerText) continue;

              // Select the placeholder run's range so AddFootnote inserts here
              var pfRange = pfEl.GetRange();
              if (pfRange) pfRange.Select();

              // Delete the placeholder text
              pfEl.Delete();

              // AddFootnote() creates a footnote at the current cursor position
              var fnContent = doc.AddFootnote();
              if (fnContent) {
                // Fill footnote with saved content text
                var fnIdx = parseInt(pfr.markerName.replace("scribe-fn-", ""), 10);
                var fnSavedText = (fnIdx < footnoteContentTexts.length) ? footnoteContentTexts[fnIdx] : "";
                if (fnSavedText) {
                  // Get the first paragraph of the footnote and add text
                  var fnPara = fnContent.GetElement(0);
                  if (fnPara) {
                    var fnRun = Api.CreateRun();
                    fnRun.AddText(fnSavedText);
                    fnPara.AddElement(fnRun);
                  }
                }
              }
              break;
            }
          } catch (e) {
            // Footnote recreation failed — the marker is already deleted
          }
        }
      }

      // --- Table round-trip: clone tables via Copy() BEFORE InsertContent ---
      // Pre-cache table clones so they survive InsertContent destroying the selection.
      // Same pattern as image pre-cache: collect originals first, then Copy().
      var parsedTablesJson = Asc.scope.parsedTables;
      var parsedTables = parsedTablesJson ? JSON.parse(parsedTablesJson) : [];
      var tableClones = {};  // index -> ApiTable (cloned + modified), null = in-place
      var tablesModifiedInPlace = false;
      var pendingTableReductions = []; // [{selectedCellCoords}] for post-InsertContent row/col removal

      // Read partialTableInfo for partial table routing
      var partialTableInfoJson = Asc.scope.partialTableInfo;
      var partialTableInfo = partialTableInfoJson ? JSON.parse(partialTableInfoJson) : null;
      var hasMixedContent = Asc.scope.hasMixedContent;

      // Replace the content of a single cell: clear all paragraphs, rebuild from blocks.
      // Used by all injection paths (in-place, reduced clone, full clone).
      // Add block content to a paragraph: handles runs and image_placeholder blocks.
      function addBlockToParagraph(para, block, fontFamily, fontSize) {
        if (block.type === "image_placeholder" && block.name) {
          // Cell block image: reconstruct via FromJSON + AddDrawing (shared path with
          // paragraph images) using the pre-registered media path — the re-inserted
          // image keeps real media at save (fixes the table clone-path / T9 orphan bug).
          injectDrawingInto(para, block.name);
        } else {
          addRunsToParagraph(para, block.runs || [], fontFamily, fontSize);
        }
      }

      // Splice a paragraph's content: keep keepStartChars from the beginning,
      // keep keepEndChars from the end, replace the middle with new block content.
      // Used for partially-selected paragraphs in mixed Replace mode.

      function replaceCellContent(cellContent, parsedCell, fontFamily, fontSize) {
        var cellBlocks = parsedCell.blocks || [{ runs: parsedCell.runs || [] }];

        // Remove all paragraphs except the first (need at least one to modify)
        var elemCount = cellContent.GetElementsCount();
        for (var re = elemCount - 1; re > 0; re--) {
          cellContent.RemoveElement(re);
        }

        // First block → first paragraph (clear + rebuild)
        var firstPara = cellContent.GetElement(0);
        if (firstPara && firstPara.RemoveAllElements) {
          firstPara.RemoveAllElements();
        }
        if (cellBlocks.length > 0 && firstPara) {
          addBlockToParagraph(firstPara, cellBlocks[0], fontFamily, fontSize);
        }

        // Additional blocks → new paragraphs added to cell
        for (var bi = 1; bi < cellBlocks.length; bi++) {
          var newPara = Api.CreateParagraph();
          addBlockToParagraph(newPara, cellBlocks[bi], fontFamily, fontSize);
          cellContent.AddElement(bi, newPara);
        }
      }

      // In-place modification for partial table selections (Replace mode).
      function modifyOriginalTableCells(origTable, parsedCells, cFonts) {
        for (var i = 0; i < parsedCells.length; i++) {
          var pc = parsedCells[i];
          var cell = origTable.GetCell(pc.r, pc.c);
          if (!cell) continue;
          var cc = cell.GetContent();
          if (!cc || cc.GetElementsCount() === 0) continue;
          var cf = cFonts[pc.r + "," + pc.c] || {};
          replaceCellContent(cc, pc, cf.family, cf.size);
        }
      }

      // Note: buildReducedTableClone was removed — its logic is now handled inline
      // using reconstructTable() (FromJSON with Clone fallback) + cell modification.

      var allTables = null;
      var tableDocIndices = [];
      var tableSnapshots = Asc.scope.tableSnapshots || null;

      // Read font from first run of first paragraph in a table cell.
      // Works on both FromJSON-reconstructed and original/cloned tables.
      function readCellFont(table, r, c, fallbackFamily, fallbackSize) {
        var cell = table.GetCell(r, c);
        if (cell) {
          var content = cell.GetContent();
          if (content && content.GetElementsCount() > 0) {
            var para = content.GetElement(0);
            if (para && para.GetElementsCount) {
              for (var ei = 0; ei < para.GetElementsCount(); ei++) {
                var elem = para.GetElement(ei);
                if (elem.GetClassType && elem.GetClassType() === "run") {
                  var tp = elem.GetTextPr ? elem.GetTextPr() : null;
                  if (tp) {
                    return {
                      family: tp.GetFontFamily() || fallbackFamily,
                      size: tp.GetFontSize() || fallbackSize
                    };
                  }
                  break;
                }
              }
            }
          }
        }
        return { family: fallbackFamily, size: fallbackSize };
      }

      // Reconstruct a table from ToJSON snapshot, with fallback to Clone from document.
      // Returns an ApiTable (either from snapshot or from Copy()).
      function reconstructTable(ptIndex, origTable) {
        if (tableSnapshots && tableSnapshots[ptIndex]) {
          try {
            var fromJsonTable = Api.FromJSON(tableSnapshots[ptIndex]);
            if (fromJsonTable) return fromJsonTable;
          } catch (fjErr) {
            log("FromJSON failed for TABLE:" + ptIndex + ", falling back to clone");
          }
        }
        // FALLBACK: legacy clone path — remove once ToJSON snapshots are proven stable
        if (origTable) return origTable.Copy();
        return null;
      }

      // §4bis #2: a table containing ANY merge must be Inserted as a FULL clone — the
      // RemoveRow/RemoveColumn reduction corrupts spans (Q4: RemoveColumn through an
      // H-span deletes the whole span). Detect via the lossless ToJSON, which emits
      // "gridSpan":N (N>=2, H-merge) and "vMerge":"restart"|"continue" (V-merge) ONLY
      // for merged cells.
      function tableHasMerge(table) {
        try {
          var s = table.ToJSON(true, true);
          return /"vMerge":\s*"(restart|continue)"/.test(s) || /"gridSpan":\s*([2-9]|\d\d+)/.test(s);
        } catch (e) { return false; }
      }

      if (parsedTables.length > 0) {
        // Find original tables by their document-level index (saved during extraction).
        // We cannot rely on selection range here — it may have collapsed since extraction.
        allTables = doc.GetAllTables();
        var tableDocIndicesJson = Asc.scope.tableDocIndices;
        tableDocIndices = tableDocIndicesJson ? JSON.parse(tableDocIndicesJson) : [];

        // Process each table: reconstruct via FromJSON (or clone) + modify cells
        for (var tci = 0; tci < parsedTables.length; tci++) {
          var ptEntry = parsedTables[tci];
          var ptIndex = ptEntry.index;
          var ptCells = ptEntry.cells;
          // Map TABLE:N index to document-level table index
          var docIdx = tableDocIndices[ptIndex];
          var origTable = (docIdx !== undefined && allTables && docIdx < allTables.length) ? allTables[docIdx] : null;

          // Check if this is a partial table
          var isPartialTable = (partialTableInfo && partialTableInfo[ptIndex]);
          var selectedCellCoords = isPartialTable ? partialTableInfo[ptIndex] : null;

          // Read source font from the reconstructed (or original) table for each cell
          // Use the snapshot table if available, otherwise fall back to original
          var fontSourceTable = null;
          if (tableSnapshots && tableSnapshots[ptIndex]) {
            try {
              fontSourceTable = Api.FromJSON(tableSnapshots[ptIndex]);
            } catch (fse) {
              fontSourceTable = null;
            }
          }
          if (!fontSourceTable) fontSourceTable = origTable;

          var cFonts = {};
          if (fontSourceTable) {
            for (var cfi = 0; cfi < ptCells.length; cfi++) {
              var ptc = ptCells[cfi];
              var cfKey = ptc.r + "," + ptc.c;
              cFonts[cfKey] = readCellFont(fontSourceTable, ptc.r, ptc.c, srcFontFamily, srcFontSize);
            }
          } else {
            for (var cfi2 = 0; cfi2 < ptCells.length; cfi2++) {
              cFonts[ptCells[cfi2].r + "," + ptCells[cfi2].c] = { family: srcFontFamily, size: srcFontSize };
            }
          }

          if (mode === "replace") {
            // Check if selection structurally encompasses the table
            // (not just content within cells). Clone+InsertContent only works
            // when the table structure is in the selection.
            var repTblRange = origTable ? origTable.GetRange() : null;
            var repSelRange = doc.GetRangeBySelect();
            var isStructuralFull = false;
            if (repTblRange && repSelRange && !isPartialTable) {
              isStructuralFull = repTblRange.GetStartPos() >= repSelRange.GetStartPos()
                && repTblRange.GetEndPos() <= repSelRange.GetEndPos();
            }

            if (isStructuralFull) {
              // Full table structurally selected — reconstruct via FromJSON + InsertContent
              var repClone = reconstructTable(ptIndex, origTable);
              if (!repClone) continue;
              for (var rci = 0; rci < ptCells.length; rci++) {
                var rc = ptCells[rci];
                var rcCell = repClone.GetCell(rc.r, rc.c);
                if (!rcCell) continue;
                var rcCc = rcCell.GetContent();
                if (!rcCc || rcCc.GetElementsCount() === 0) continue;
                var rcf = cFonts[rc.r + "," + rc.c] || {};
                replaceCellContent(rcCc, rc, rcf.family, rcf.size);
              }
              tableClones[ptIndex] = repClone;
            } else {
              // In-place modification (partial, content-only full, or mixed)
              // Note: in-place modifies the document table directly — no snapshot needed
              if (origTable) {
                modifyOriginalTableCells(origTable, ptCells, cFonts);
              }
              tableClones[ptIndex] = null;
              tablesModifiedInPlace = true;
            }
          } else if (isPartialTable) {
            // Partial Insert — reconstruct via FromJSON, modify selected cells
            var reducedClone = reconstructTable(ptIndex, origTable);
            if (!reducedClone) continue;
            for (var rdi = 0; rdi < ptCells.length; rdi++) {
              var rdc = ptCells[rdi];
              var rdCell = reducedClone.GetCell(rdc.r, rdc.c);
              if (!rdCell) continue;
              var rdCc = rdCell.GetContent();
              if (!rdCc || rdCc.GetElementsCount() === 0) continue;
              var rdf = cFonts[rdc.r + "," + rdc.c] || {};
              replaceCellContent(rdCc, rdc, rdf.family, rdf.size);
            }
            tableClones[ptIndex] = reducedClone;
            // §4bis #2: only reduce (RemoveRow/Column) when the table has NO merge.
            // Merged → keep the FULL clone (selected cells already modified above);
            // reduction would corrupt the spans.
            if (!tableHasMerge(reducedClone)) {
              pendingTableReductions.push({ clone: reducedClone, selectedCellCoords: selectedCellCoords });
            }
          } else {
            // Full Insert — reconstruct via FromJSON + modify all cells
            var clone = reconstructTable(ptIndex, origTable);
            if (!clone) continue;
            for (var mci = 0; mci < ptCells.length; mci++) {
              var mc = ptCells[mci];
              var cloneCell = clone.GetCell(mc.r, mc.c);
              if (!cloneCell) continue;
              var cloneCc = cloneCell.GetContent();
              if (!cloneCc || cloneCc.GetElementsCount() === 0) continue;
              var mcf = cFonts[mc.r + "," + mc.c] || {};
              replaceCellContent(cloneCc, mc, mcf.family, mcf.size);
            }
            tableClones[ptIndex] = clone;
          }
        }
      }

      // Helper: create a space run matching surrounding font
      // Create a formatted hyperlink — applies bold/italic/strikethrough to child runs
      function makeHyperlink(run) {
        var link = Api.CreateHyperlink(run.link, run.text, "");
        // Apply formatting to the hyperlink's child runs
        if (run.bold || run.italic || run.strikethrough || run.underline || run.code) {
          var linkCount = link.GetElementsCount ? link.GetElementsCount() : 0;
          for (var li = 0; li < linkCount; li++) {
            var linkRun = link.GetElement(li);
            if (linkRun && linkRun.GetClassType && linkRun.GetClassType() === "run") {
              if (run.bold) linkRun.SetBold(true);
              if (run.italic) linkRun.SetItalic(true);
              if (run.strikethrough) linkRun.SetStrikeout(true);
              if (run.underline) linkRun.SetUnderline(true);
              if (run.code) linkRun.SetFontFamily("Courier New");
            }
          }
        }
        return link;
      }

      function makeSpaceRun() {
        var sr = Api.CreateRun();
        sr.AddText(" ");
        if (srcFontFamily) sr.SetFontFamily(srcFontFamily);
        if (srcFontSize) sr.SetFontSize(srcFontSize);
        return sr;
      }

      // Shared function: add runs to a paragraph (used for both document paragraphs
      // and table cells). Handles text, bold/italic/strikethrough/code, hyperlinks,
      // and inline images (via injectDrawingInto — FromJSON + AddDrawing from the
      // pre-registered media map, same path for paragraph and table-cell images).
      function addRunsToParagraph(para, runs, fontFamily, fontSize) {
        for (var ri = 0; ri < runs.length; ri++) {
          var run = runs[ri];
          if (run.imageMarker) {
            // Inline image: reconstruct via FromJSON + AddDrawing with the blip rewritten
            // to the registered media path — one path for cell and paragraph images.
            injectDrawingInto(para, run.imageMarker);
          } else if (run.footnoteMarker) {
            // Footnote placeholder: defer actual footnote creation to post-InsertContent.
            // AddFootnote requires the cursor to be in the document.
            var fnPlaceholder = Api.CreateRun();
            var fnMarkerText = "\u0000FN:" + run.footnoteMarker + "\u0000";
            fnPlaceholder.AddText(fnMarkerText);
            if (fontFamily) fnPlaceholder.SetFontFamily(fontFamily);
            if (fontSize) fnPlaceholder.SetFontSize(fontSize);
            para.AddElement(fnPlaceholder);
            pendingFootnotes.push({ para: para, markerName: run.footnoteMarker, markerText: fnMarkerText });
          } else if (run.crossRefMarker) {
            // Recreate cross-reference as a hyperlink with internal anchor.
            // OO cross-refs use "anchor" (internal bookmark link, prop Us on internal obj),
            // NOT "link" (external URL, prop ma). Api.CreateHyperlink sets ma (URL),
            // so we create one then swap: clear ma, set Us to the anchor value.
            var crMeta = crossRefMeta[run.crossRefMarker];
            // Use LLM's text if available, fall back to original extraction text
            var crDisplayText = run.crossRefText || (crMeta ? crMeta.displayedText : "") || "";
            if (crMeta && crDisplayText) {
              var crInserted = false;
              // Extract anchor from cached JSON
              var crAnchor = "";
              var crTooltip = crMeta.screenTip || "";
              if (crMeta.json) {
                try {
                  crAnchor = (crMeta.json.anchor || "").replace(/[\r\n]+$/, "");
                  crTooltip = (crMeta.json.tooltip || crMeta.screenTip || "").replace(/[\r\n]+$/, "");
                } catch (e) {}
              }
              // For bookmarks: find the actual bookmark name
              if (crMeta.type === "bookmark" && !crAnchor) {
                var bm = findBookmarkName(crMeta.screenTip);
                if (bm) crAnchor = bm;
              }
              // For headings: the anchor (e.g. "_Un_titre") is NOT a real bookmark.
              // Create a real bookmark on the heading paragraph so the hyperlink can target it.
              if (crMeta.type === "heading") {
                try {
                  // Match heading by screenTip text (more reliable than anchor name)
                  var headingText = (crMeta.screenTip || "").replace(/^#_/, "").replace(/_/g, " ");
                  var hParas = doc.GetAllHeadingParagraphs();
                  for (var hpi = 0; hpi < hParas.length; hpi++) {
                    var hpText = hParas[hpi].GetText ? hParas[hpi].GetText() : "";
                    hpText = hpText.replace(/[\s\n\r]+$/, "");
                    if (hpText === headingText) {
                      // Use a clean bookmark name (no leading underscore — may be reserved)
                      var bmName = "scribe_heading_" + run.crossRefMarker.replace("scribe-ref-", "");
                      var hRange = hParas[hpi].GetRange();
                      if (hRange && hRange.AddBookmark) {
                        hRange.AddBookmark(bmName);
                        crAnchor = bmName;  // override anchor to point to our new bookmark
                      }
                      break;
                    }
                  }
                } catch (e) { /* bookmark creation failed */ }
              }
              if (crAnchor) {
                try {
                  // Create hyperlink with placeholder URL, correct text and tooltip
                  var crLink = Api.CreateHyperlink("http://tmp", crDisplayText, crTooltip);
                  if (crLink) {
                    // Patch internal object: swap URL → anchor
                    // Internal props (from diagnostic): ma=URL, Us=anchor, YD=tooltip
                    var crInternal = crLink.u0;
                    if (crInternal) {
                      crInternal.ma = "";        // clear external URL
                      crInternal.Us = crAnchor;  // set internal anchor
                      crInternal.YD = crTooltip; // set tooltip
                    }
                    para.AddElement(crLink);
                    crInserted = true;
                  }
                } catch (e) { /* internal patching failed */ }
              }
              if (!crInserted) {
                // Fallback: plain text
                var crFb = Api.CreateRun();
                crFb.AddText(crDisplayText);
                if (fontFamily) crFb.SetFontFamily(fontFamily);
                if (fontSize) crFb.SetFontSize(fontSize);
                para.AddElement(crFb);
              }
            }
          } else if (run.link) {
            para.AddElement(makeHyperlink(run));
          } else {
            var r = Api.CreateRun();
            r.AddText(run.text);
            if (run.bold) r.SetBold(true);
            if (run.italic) r.SetItalic(true);
            if (run.strikethrough) r.SetStrikeout(true);
            if (run.underline) r.SetUnderline(true);
            if (run.code) {
              r.SetFontFamily("Courier New");
              if (fontSize) r.SetFontSize(fontSize);
            } else {
              if (fontFamily) r.SetFontFamily(fontFamily);
              if (fontSize) r.SetFontSize(fontSize);
            }
            para.AddElement(r);
          }
        }
      }

      // For mixed Replace with in-place table modification:
      // modify text paragraphs in-place too (BEFORE content building to avoid
      // Api.CreateParagraph() triggering OO undo rollback of cell modifications).
      // For mixed Replace (text + table): use per-paragraph InsertContent
      // BEFORE content building. This is necessary because:
      //   1. A single InsertContent can't exclude a table in the middle of the selection
      //   2. Api.CreateParagraph() in content building causes OO to rollback in-place cell mods
      // Each non-table paragraph gets its own narrowed InsertContent (inline mode),
      // which handles partial paragraphs natively (preserves prefix/suffix).
      // Processed in reverse order to avoid position shifts.
      // Cross-boundary post-selection locators: two plain-ASCII sentinel runs
      // BRACKET each modified text ¶'s injected content (one before, one after) so
      // the post-selection can re-find the exact injected span after the inline
      // merge absorbs pbParagraph's refs and shifts its top-level position. Both are
      // deleted before the selection is built (with shift compensation), so they
      // never leak into the saved doc and the selection covers the injected text
      // only — not the kept prefix/suffix.
      var SCRIBE_XSEL_A = "zZscribeXAZz"; // opens the injected span
      var SCRIBE_XSEL_B = "zZscribeXBZz"; // closes the injected span
      var skipContentAndInsert = false;
      if (mode === "replace" && tablesModifiedInPlace && hasMixedContent) {
        try {
          var mixSelRange = doc.GetRangeBySelect();
          if (mixSelRange) {
            var mixParas = mixSelRange.GetAllParagraphs();
            // Collect non-table paragraphs
            var nonTableParas = [];
            for (var mpi = 0; mpi < mixParas.length; mpi++) {
              // Element-based table-membership test (§4quater). A paragraph is "in a
              // table" iff it has a parent table cell — position-independent, so it is
              // immune to the header/footer position collision. The OLD raw-position
              // test compared the paragraph start against every doc.GetAllTables()
              // range, but GetAllTables INCLUDES header/footer tables living in a
              // separate 0-based coordinate space: a top-of-body paragraph (low
              // position) then falsely matched a header table's range -> it was dropped
              // from nonTableParas -> nonTableParas became empty -> the mixed in-place
              // path was skipped -> the general path ran a DESTRUCTIVE full-range
              // InsertContent that deleted a table row (H2/replace corruption).
              var mpInTable = false;
              try {
                var mpCell = mixParas[mpi].GetParentTableCell ? mixParas[mpi].GetParentTableCell() : null;
                if (mpCell) mpInTable = true;
              } catch (e) {}
              if (!mpInTable) nonTableParas.push(mixParas[mpi]);
            }
            if (nonTableParas.length > 0) {
              // Match non-table paragraphs to non-table-placeholder blocks (forward)
              var paraBlockPairs = [];
              var mixBlockIdx = 0;
              for (var ntpi = 0; ntpi < nonTableParas.length; ntpi++) {
                while (mixBlockIdx < blocks.length) {
                  var mbRuns = blocks[mixBlockIdx].runs || [];
                  var mbText = "";
                  for (var mbj = 0; mbj < mbRuns.length; mbj++) { mbText += mbRuns[mbj].text || ""; }
                  if (mbText.indexOf("SCRIBE-TABLE-") === -1) break;
                  mixBlockIdx++;
                }
                if (mixBlockIdx >= blocks.length) break;
                paraBlockPairs.push({ para: nonTableParas[ntpi], block: blocks[mixBlockIdx] });
                mixBlockIdx++;
              }

              // Process in REVERSE order to avoid position shifts
              var origStart = mixSelRange.GetStartPos();
              var origEnd = mixSelRange.GetEndPos();
              for (var pbpi = paraBlockPairs.length - 1; pbpi >= 0; pbpi--) {
                var pbPara = paraBlockPairs[pbpi].para;
                var pbBlock = paraBlockPairs[pbpi].block;
                var pbRange = pbPara.GetRange ? pbPara.GetRange() : null;
                if (!pbRange) continue;
                var pbStart = pbRange.GetStartPos();
                var pbEnd = pbRange.GetEndPos();

                // Clip selection to this paragraph's range
                var selPStart = (origStart > pbStart) ? origStart : pbStart;
                var selPEnd = (origEnd < pbEnd) ? origEnd : pbEnd;

                // Select the paragraph's selected portion
                var selPRange = doc.GetRange(selPStart, selPEnd);
                if (selPRange) selPRange.Select();

                // Build content and InsertContent (same mechanism as non-table case).
                // Bracket the injected runs with two sentinels so the post-selection
                // can recover the exact injected span (kept prefix/suffix excluded).
                var pbParagraph = Api.CreateParagraph();
                try { var xRunA = Api.CreateRun(); xRunA.AddText(SCRIBE_XSEL_A); pbParagraph.AddElement(xRunA); } catch (e) {}
                addBlockToParagraph(pbParagraph, pbBlock, srcFontFamily, srcFontSize);
                try { var xRunB = Api.CreateRun(); xRunB.AddText(SCRIBE_XSEL_B); pbParagraph.AddElement(xRunB); } catch (e) {}
                doc.InsertContent([pbParagraph], true); // inline mode: preserves suffix

                // Save the narrowed selection bounds for post-selection.
                // selPStart is still valid (within the just-modified paragraph).
                // For the combined range, the cell bounds (computed in post-selection)
                // provide the table portion — min/max naturally picks the right bounds.
              }
              skipContentAndInsert = true;
            }
          }
        } catch (e) {
          // In-place failed — fall through to normal content building
        }
      }

      var content = [];
      if (!skipContentAndInsert)
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var isFirst = (i === 0);
        var isLast = (i === blocks.length - 1);

        // Table placeholder detection: substitute cloned table for SCRIBE-TABLE-N
        if (block.type === "paragraph" && block.runs && block.runs.length === 1) {
          var plText = block.runs[0].text || "";
          var plMatch = plText.match(/^SCRIBE-TABLE-(\d+)$/);
          if (plMatch) {
            var plIdx = parseInt(plMatch[1]);
            if (tableClones[plIdx] === null) {
              // Partial table in Replace mode — already modified in-place, skip placeholder
              continue;
            }
            if (tableClones[plIdx]) {
              content.push(tableClones[plIdx]);
            }
            continue;
          }
        }

        if (block.type === "heading") {
          var p = Api.CreateParagraph();
          var styleName = "Heading " + block.depth;
          var headingStyle = doc.GetStyle(styleName);
          if (headingStyle) p.SetStyle(headingStyle);
          if (isFirst && needSpaceBefore) p.AddElement(makeSpaceRun());
          addRunsToParagraph(p, block.runs || [], null, null);
          if (isLast && needSpaceAfter) p.AddElement(makeSpaceRun());
          content.push(p);
        } else if (block.type === "list_item") {
          var p = Api.CreateParagraph();
          var numbering = block.ordered ? orderedNumbering : bulletNumbering;
          var numLvl = numbering.GetLevel(block.level);
          p.SetNumbering(numLvl);
          if (isFirst && needSpaceBefore) p.AddElement(makeSpaceRun());
          addRunsToParagraph(p, block.runs || [], srcFontFamily, srcFontSize);
          if (isLast && needSpaceAfter) p.AddElement(makeSpaceRun());
          content.push(p);
        } else if (block.type === "code_block") {
          var p = Api.CreateParagraph();
          // Dark background (charcoal) with light text for code blocks
          p.SetShd("clear", 40, 44, 52);
          // Tight spacing between code lines
          p.SetSpacingAfter(0);
          p.SetSpacingBefore(0);
          if (isFirst && needSpaceBefore) p.AddElement(makeSpaceRun());
          var runs = block.runs || [];
          for (var j = 0; j < runs.length; j++) {
            var run = runs[j];
            if (run.imageMarker) {
              injectDrawingInto(p, run.imageMarker);
            } else {
              var r = Api.CreateRun();
              r.AddText(run.text);
              r.SetFontFamily("Courier New");
              r.SetColor(212, 212, 212);
              if (srcFontSize) r.SetFontSize(srcFontSize);
              p.AddElement(r);
            }
          }
          if (isLast && needSpaceAfter) p.AddElement(makeSpaceRun());
          content.push(p);
        } else if (block.type === "table") {
          var nCols = (block.header || []).length;
          var nRows = (block.rows || []).length + 1; // +1 for header row
          if (nCols === 0 || nRows === 0) continue; // skip degenerate tables

          var table = Api.CreateTable(nCols, nRows);
          table.SetWidth("percent", 100);

          // Set all borders (thin single line)
          table.SetTableBorderTop("single", 4, 0, 0, 0, 0);
          table.SetTableBorderBottom("single", 4, 0, 0, 0, 0);
          table.SetTableBorderLeft("single", 4, 0, 0, 0, 0);
          table.SetTableBorderRight("single", 4, 0, 0, 0, 0);
          table.SetTableBorderInsideH("single", 4, 0, 0, 0, 0);
          table.SetTableBorderInsideV("single", 4, 0, 0, 0, 0);

          // Helper: fill a cell with formatted runs
          function fillCell(row, col, runs) {
            var cell = table.GetCell(row, col);
            if (!cell) return;
            var cellContent = cell.GetContent();
            if (!cellContent) return;
            var cellPara = cellContent.GetElement(0);
            if (!cellPara) return;
            addRunsToParagraph(cellPara, runs, srcFontFamily, srcFontSize);
          }

          // Fill header row (row 0) — bold by default
          var headerCells = block.header || [];
          for (var hc = 0; hc < headerCells.length; hc++) {
            var hRuns = headerCells[hc].runs || [];
            // Force bold on header cell runs
            var boldRuns = [];
            for (var hr = 0; hr < hRuns.length; hr++) {
              var hRun = {};
              for (var hk in hRuns[hr]) { hRun[hk] = hRuns[hr][hk]; }
              hRun.bold = true;
              boldRuns.push(hRun);
            }
            fillCell(0, hc, boldRuns);
          }

          // Fill body rows (rows 1..nRows-1)
          var bodyRows = block.rows || [];
          for (var br = 0; br < bodyRows.length; br++) {
            var rowCells = bodyRows[br] || [];
            for (var bc = 0; bc < rowCells.length; bc++) {
              fillCell(br + 1, bc, rowCells[bc].runs || []);
            }
          }

          // Note: smart spacing (needSpaceBefore/After) does not apply to tables
          // since tables are standalone block elements in OO
          content.push(table);
        } else if (block.type === "paragraph") {
          var p = Api.CreateParagraph();
          if (isFirst && needSpaceBefore) p.AddElement(makeSpaceRun());
          addRunsToParagraph(p, block.runs || [], srcFontFamily, srcFontSize);
          if (isLast && needSpaceAfter) p.AddElement(makeSpaceRun());
          content.push(p);
        } else if (block.type === "image_placeholder") {
          // Pure-image paragraph (top-level): reconstruct via FromJSON + AddDrawing
          // with the blip rewritten to the pre-registered media path (non-orphan at save).
          var imgPara = Api.CreateParagraph();
          if (isFirst && needSpaceBefore) imgPara.AddElement(makeSpaceRun());
          var added = injectDrawingInto(imgPara, block.name);
          if (isLast && needSpaceAfter) imgPara.AddElement(makeSpaceRun());
          if (added) content.push(imgPara);
          // If the image is unknown/failed (deleted from doc or media register failed), skip.
        }

        // Apply blockquote styling if flagged
        if (block.blockquote && content.length > 0) {
          var lastP = content[content.length - 1];
          if (quoteStyle) {
            // Use the document's predefined quote/citation style
            lastP.SetStyle(quoteStyle);
          } else {
            // Fallback: manual left indent (720 twips = 0.5 inch)
            lastP.SetIndLeft(720);
          }
        }
      }

      if (content.length > 0) {
        // For Replace with mixed content + partial table modified in-place:
        // modify non-table paragraphs in-place too (no InsertContent at all).
        // This avoids InsertContent destroying the table rows.

        // Save selection start position before InsertContent (for replace mode selection)
        var preSelStart = 0;
        try {
          var preRange = doc.GetRangeBySelect();
          if (preRange) preSelStart = preRange.GetStartPos();
        } catch (e) {}

        // Calculate total text length from blocks (for position-based selection)
        var totalTextLen = 0;
        for (var ti = 0; ti < blocks.length; ti++) {
          var bRuns = blocks[ti].runs || [];
          for (var tj = 0; tj < bRuns.length; tj++) {
            totalTextLen += bRuns[tj].text.length;
          }
        }
        // Note: table blocks contribute no text to totalTextLen — they use ref-based
        // selection (block mode) where position arithmetic is not needed.
        // Note: image_placeholder blocks contribute no text to totalTextLen either --
        // images are drawings with no text content, and position-based selection
        // correctly skips them.
        // Account for space runs added by spacing logic
        if (needSpaceBefore) totalTextLen += 1;
        if (needSpaceAfter) totalTextLen += 1;
        var mergedTrailingLen = 0; // track trailing text merged into last paragraph
        // REAL position of the merge junction = where the host suffix starts once it
        // has been appended into the last injected ¶. Captured live at merge time
        // (cleanupTrailingBlockPara) instead of being derived by subtracting
        // mergedTrailingLen from the paragraph end. Same reasoning as the inline
        // sentinel above: OO positions count run boundaries, so ANY arithmetic on
        // them mis-counts as soon as run structure varies — and it does, because the
        // inject paths leave a VARYING number of empty runs behind (A6: 1 empty run
        // on the insert path, 2 on the replace path, for the same final text). That
        // is exactly the off-by-one that made A6/insert's post-selection swallow one
        // host character (« Second e » instead of « Second »), while replace — same
        // formula, different litter — happened to land right.
        // Held as a live RUN OBJECT, not a position: `doc.GetRange(int,int)` does not
        // compose reliably across a cell boundary (legend L#2), and the block path is
        // used by cross table↔¶ cases (T4/T5/T7). The reliable primitive is ExpandTo
        // of two LIVE range objects — so we keep the object and ask it for its range
        // at selection time.
        var mergedTrailingRunRef = null;

        var useRefSelection = false; // true = use paragraph refs, false = use position-based
        // Inline insert/replace merges runs into the host ¶, so neither content refs
        // (absorbed) nor char arithmetic work for the post-selection: OO logical
        // positions count run boundaries, so `preSelStart + textLen` mis-counts — and
        // it gets WORSE with styled runs (each adds boundaries), which is the off-by-N
        // users see. Fix: append a sentinel run to the inline content; after
        // InsertContent, fresh-scan for it, take its REAL start position as the
        // selection end, then delete it. Two real positions (start + sentinel) → exact
        // selection, style-agnostic. Deletion is reliable (probe-confirmed) so it never
        // leaks; uses a plain-ASCII token (NOT a  marker — a real NUL byte in
        // source corrupts the file). (Block mode keeps refs → selectByRefs; tables
        // derive bounds from real cell ranges → both already correct.)
        var SCRIBE_SEL_SENT = "zZscribeSelMarkZz";
        var useSentinelSel = false; // inline insert/replace: select via sentinel, not arithmetic
        function appendSelSentinel(para) {
          try { var sr = Api.CreateRun(); sr.AddText(SCRIBE_SEL_SENT); para.AddElement(sr); } catch (e) {}
        }

        // §5bis A6 (UAT 2026-07-16) : append a source paragraph's runs (preserving char
        // formatting: bold/italic/underline/strike/font) to a target paragraph. Used to
        // MERGE the last injected para into the surviving suffix so they share one line.
        // Returns the FIRST run actually appended — i.e. a live handle on where the
        // host suffix now begins. That handle is the only honest anchor for the
        // post-selection end (see mergedTrailingRunRef): every arithmetic alternative
        // is expressed in OO position units, which count run boundaries and therefore
        // depend on empty-run litter.
        function appendRunsPreserving(target, source) {
          var n = source && source.GetElementsCount ? source.GetElementsCount() : 0;
          var firstAppended = null;
          for (var i = 0; i < n; i++) {
            var el = source.GetElement(i);
            var ct = el && el.GetClassType ? el.GetClassType() : "";
            var nr = Api.CreateRun();
            nr.AddText(el && el.GetText ? el.GetText() : "");
            if (ct === "run") {
              var tp = el.GetTextPr ? el.GetTextPr() : null;
              if (tp) {
                try { if (tp.GetBold && tp.GetBold()) nr.SetBold(true); } catch (e) {}
                try { if (tp.GetItalic && tp.GetItalic()) nr.SetItalic(true); } catch (e) {}
                try { if (tp.GetUnderline && tp.GetUnderline()) nr.SetUnderline(true); } catch (e) {}
                try { if (tp.GetStrikeout && tp.GetStrikeout()) nr.SetStrikeout(true); } catch (e) {}
                try { var ff = tp.GetFontFamily && tp.GetFontFamily(); if (ff) nr.SetFontFamily(ff); } catch (e) {}
                try { var fsz = tp.GetFontSize && tp.GetFontSize(); if (fsz) nr.SetFontSize(fsz); } catch (e) {}
              }
            }
            try { target.AddElement(nr); if (!firstAppended) firstAppended = nr; } catch (e) {}
          }
          return firstAppended;
        }

        // §5bis: after a BLOCK InsertContent, OO splits the host ¶ at the insertion
        // point and the right remainder becomes a trailing paragraph. Remove it ONLY
        // if it is EMPTY (insertion at the host's start/end) so no empty ¶ is left at
        // the edges. If it is NON-EMPTY (insertion at a true middle), KEEP it as-is —
        // that is the host split whose right half keeps the host ¶ style AND its own
        // run formatting. (The previous replace path rebuilt it from plain GetText(),
        // which dropped bold/italic and leaked a trailing \r.)
        function cleanupTrailingBlockPara() {
          try {
            var lastContentPara = content[content.length - 1];
            var lcRange = lastContentPara && lastContentPara.GetRange ? lastContentPara.GetRange() : null;
            if (!lcRange) return;
            var lcEndPos = lcRange.GetEndPos();
            // Scan the container that HOLDS the injected content, not the document.
            // When the injection host is inside a table cell, the trailing (split-right)
            // ¶ is a CELL paragraph — NOT a top-level doc element — so a doc.GetElement
            // scan skips it and matches the first TOP-LEVEL element after the table
            // instead (e.g. the paragraph following the table), then merges/removes THAT
            // — pulling unrelated body content into the cell (T8 corruption). Scanning
            // the host cell's own content keeps the cleanup inside the cell boundary.
            var lcCell = lastContentPara.GetParentTableCell ? lastContentPara.GetParentTableCell() : null;
            var scanDoc = (lcCell && lcCell.GetContent) ? lcCell.GetContent() : doc;
            // The LAST injected element can be a TABLE (a table-only or table-tailed
            // response). Then neither of the paragraph branches below applies: a table
            // has no runs to merge a suffix into and no ¶ style to hand down. The
            // `blocks` guard alone does NOT catch this — blocks[last] is the PLACEHOLDER
            // ¶ (SCRIBE-TABLE-n) standing in for the substituted table, so it reads as
            // plain and wrongly opened the merge branch, which appended the suffix into
            // the table (a no-op) and then REMOVED it — destroying the paragraph after
            // the table (T3/H1: "Outro paragraph" lost). Same placeholder-vs-content
            // trap as insSimpleInline (l.2177) / isSimpleInline (l.2233).
            var lastIsTable = !!(lastContentPara.GetClassType && lastContentPara.GetClassType() === "table");
            var total = scanDoc.GetElementsCount();
            for (var si = 0; si < total; si++) {
              var scanEl = scanDoc.GetElement(si);
              var scanRange = scanEl && scanEl.GetRange ? scanEl.GetRange() : null;
              if (scanRange && scanRange.GetStartPos() >= lcEndPos) {
                var trailText = (scanRange.GetText() || "").replace(/[\r\n]+$/, "");
                if (trailText.length === 0) {
                  scanDoc.RemoveElement(si); // empty right half -> no ¶ vide at the edge
                } else if (lastIsTable) {
                  // last injected element is a TABLE -> leave the following ¶ untouched
                } else if (!blockHasParaStyle(blocks[blocks.length - 1])) {
                  // §5bis A6 : the paste point is a true MIDDLE (suffix survives) AND the
                  // LAST injected para is PLAIN → merge that last para INTO the suffix so
                  // they land on ONE line (« Second » + « er flows » → « Second er flows »),
                  // instead of two paragraphs. The merged ¶ keeps the host ¶ style.
                  // Record the POSITION span of the appended suffix (measured, not char-
                  // counted, so it stays exact with multi-run/formatted suffixes) so the
                  // post-selection can exclude the surviving host suffix (§5bis A6-postsel).
                  var lcPreMergeEnd = lastContentPara.GetRange ? lastContentPara.GetRange().GetEndPos() : -1;
                  var firstMerged = appendRunsPreserving(lastContentPara, scanEl);
                  if (lcPreMergeEnd >= 0 && lastContentPara.GetRange) {
                    var lcPostMergeEnd = lastContentPara.GetRange().GetEndPos();
                    if (lcPostMergeEnd > lcPreMergeEnd) mergedTrailingLen = lcPostMergeEnd - lcPreMergeEnd;
                  }
                  // The junction = where the appended suffix begins. Keep a handle on
                  // the first appended RUN and let it report its own range later.
                  // NOT `paraEnd - mergedTrailingLen`, NOT the pre-merge ¶ end: both are
                  // position-unit arithmetic, and the ¶ end sits one unit past the last
                  // run (the ¶ mark slot) — which the append then fills with the
                  // suffix's first character. That is the off-by-one that made
                  // A6/insert select « Second e » and T5/insert « Tail edit a ». The
                  // replace path only looked correct because it happened to carry an
                  // EMPTY RUN just before the suffix, whose extra unit absorbed the
                  // error: empty-run litter was load-bearing by accident.
                  mergedTrailingRunRef = firstMerged;
                  if (hostStyle && lastContentPara.SetStyle) lastContentPara.SetStyle(hostStyle);
                  scanDoc.RemoveElement(si); // suffix content now lives in lastContentPara
                } else if (hostStyle && scanEl.SetStyle) {
                  scanEl.SetStyle(hostStyle); // §5bis split invariant: right half keeps host ¶ style (styled last block stays separate)
                }
                break;
              }
            }
          } catch (e) {}
        }

        // §5bis Cas A: when the 1st injected para is PLAIN (no md style), it merges
        // inline into the host's LEFT split half. Give that first content paragraph
        // the HOST ¶ style up front, so after OO's merge the left half keeps the host
        // style (OO would otherwise stamp the para's default Normal style on it).
        // Cas B (1st para has its own md style — heading/list/quote/code) is left
        // untouched: it stays a block with its own style.
        function applyHostStyleToFirstParaIfPlain() {
          try {
            if (blocks[0] && blocks[0].type === "paragraph"
                && content[0] && content[0].GetClassType
                && content[0].GetClassType() === "paragraph") {
              // content[0] is a plain paragraph → OO's block InsertContent merges it
              // into the host's (left) split half. Flag it so the post-selection starts
              // at the merge junction, not the merged paragraph's start (§5bis A6-postsel).
              firstParaMergedInline = true;
              if (hostStyle && content[0].SetStyle) content[0].SetStyle(hostStyle);
            }
          } catch (e) {}
        }

        // §5bis Cas B: does the 1st injected block carry its own paragraph-level
        // md style (heading / list / quote / fenced code)? Character formatting
        // (bold/italic/…) does NOT count — a bold plain paragraph stays "plain".
        // Tables / images are standalone blocks and never merge into the host, so
        // they don't need the spacer trick.
        function blockHasParaStyle(b) {
          if (!b) return false;
          if (b.type === "heading" || b.type === "list_item" || b.type === "code_block") return true;
          if (b.type === "paragraph" && b.blockquote) return true;
          return false;
        }
        firstBlockStyled = blockHasParaStyle(blocks[0]);

        // §5bis Cas B: prepend a host-styled EMPTY paragraph so OO's block
        // InsertContent merges *it* (empty) into the host's left split half — the
        // merged half then keeps the HOST style (OO stamps content[0]'s style on the
        // merge target), and the real styled 1st block stays a separate ¶. Mutually
        // exclusive with the Cas A inline-style fix.
        function prepareFirstBlockForMerge() {
          // Spacer trick when the 1st block is styled (Cas B) OR when inserting at a
          // ¶-END caret (A1/A5): unshift an empty host-styled ¶ so OO merges IT into
          // the host (host unchanged) and content[0] stays a separate NEW ¶.
          if (firstBlockStyled || insCaretAtEnd) {
            try {
              var sp = Api.CreateParagraph();
              if (hostStyle && sp.SetStyle) sp.SetStyle(hostStyle);
              content.unshift(sp);
              leadSpacerInserted = true;
            } catch (e) {}
          } else {
            applyHostStyleToFirstParaIfPlain(); // §5bis Cas A
          }
        }

        // §5bis Cas B: after the block insert, drop the leading host-styled spacer
        // IF it ended up empty. Two shapes are possible and both resolve correctly:
        //  - spacer merged into a non-empty host left half → element before the 1st
        //    real block is that non-empty half → KEEP it.
        //  - spacer left as a standalone empty ¶ (no merge), or merged into an empty
        //    left half (@start insertion) → element before the 1st real block is
        //    empty → REMOVE it (no ¶ vide at the edge, §5bis).
        function cleanupLeadingSpacer() {
          try {
            var firstReal = content[1]; // content[0] is the spacer
            var frRange = firstReal && firstReal.GetRange ? firstReal.GetRange() : null;
            if (!frRange) return;
            var frStart = frRange.GetStartPos();
            // Same cell-boundary reasoning as cleanupTrailingBlockPara: scan the host
            // cell's content (not the doc) when the spacer landed inside a cell, so the
            // "element before the 1st real block" is a cell paragraph, never a top-level
            // body element preceding the whole table.
            var frCell = firstReal.GetParentTableCell ? firstReal.GetParentTableCell() : null;
            var scanDoc = (frCell && frCell.GetContent) ? frCell.GetContent() : doc;
            var total = scanDoc.GetElementsCount();
            var prevIdx = -1;
            for (var i = 0; i < total; i++) {
              var el = scanDoc.GetElement(i);
              var r = el && el.GetRange ? el.GetRange() : null;
              if (!r) continue;
              if (r.GetStartPos() >= frStart) break;
              prevIdx = i; // last element starting before the 1st real block
            }
            if (prevIdx >= 0) {
              var prevEl = scanDoc.GetElement(prevIdx);
              var pr = prevEl && prevEl.GetRange ? prevEl.GetRange() : null;
              var ptext = pr ? (pr.GetText() || "").replace(/[\r\n]+$/, "") : "";
              if (ptext.length === 0) scanDoc.RemoveElement(prevIdx);
            }
          } catch (e) {}
        }

        if (mode === "insert") {
          // Insert places content at the END OF THE SELECTION (spec §"Convention":
          // "Insérer = au point d'insertion (fin de la sélection)"). For a selection
          // that contains a table we still must collapse the cursor first (an active
          // multi-element selection would otherwise be deleted by InsertContent), but
          // the target is the selection END — NOT blindly "after the table". The old
          // code always jumped to after the last response table, so a selection of
          // {table + following ¶} inserted between the table and the ¶ ({T,F,P})
          // instead of after the ¶ ({T,P,F}). We only bump past a table when the
          // selection actually ENDS inside one (table-only / cell-end), where
          // collapsing to selEnd would land in a cell.
          if (parsedTables.length > 0) {
            try {
              var insSelR = doc.GetRangeBySelect();
              var insSelEnd = insSelR ? insSelR.GetEndPos() : -1;
              if (insSelEnd >= 0) {
                var insTarget = insSelEnd;
                // Find the BODY table whose range contains selEnd via doc.GetElement
                // (body elements ONLY) — NOT GetAllTables(), which also returns
                // header/footer tables whose 0-based positions collide with body
                // positions and would match first, sending the cursor far past the real
                // table (§4quater: "insert after top-of-body table"). Anchor to the start
                // of the element AFTER the table (or table end+1 if it is the last).
                var insBodyCount = doc.GetElementsCount();
                for (var ibe = 0; ibe < insBodyCount; ibe++) {
                  var ibel = doc.GetElement(ibe);
                  if (!ibel.GetClassType || ibel.GetClassType() !== "table") continue;
                  var ibelR = ibel.GetRange ? ibel.GetRange() : null;
                  if (ibelR && insSelEnd >= ibelR.GetStartPos() && insSelEnd <= ibelR.GetEndPos()) {
                    var ibNext = (ibe + 1 < insBodyCount) ? doc.GetElement(ibe + 1) : null;
                    var ibNextR = (ibNext && ibNext.GetRange) ? ibNext.GetRange() : null;
                    insTarget = ibNextR ? ibNextR.GetStartPos() : (ibelR.GetEndPos() + 1);
                    break;
                  }
                }
                var insCur = doc.GetRange(insTarget, insTarget);
                if (insCur) insCur.Select();
              }
            } catch (e) {
              // Cursor repositioning failed — InsertContent will use current position
            }
          }
          // §5bis: single plain paragraph -> INLINE (runs spliced into the host ¶,
          // which keeps its paragraph style); multi-¶ / styled / non-text -> BLOCK.
          // No leading empty paragraph any more (that was the L#7 bug).
          // blocks[0] is the SCRIBE-TABLE placeholder PARAGRAPH, but content[0] may
          // have been substituted with a TABLE clone (table-only Insert: T2a/T3).
          // Inserting a table in inline mode at a collapsed cursor is a silent no-op
          // → only treat as inline when the actual content element is a paragraph.
          // §5bis: single plain paragraph -> INLINE (runs spliced into the host ¶);
          // multi-¶ / styled / non-text -> BLOCK. At a ¶-END caret, force BLOCK+spacer
          // so a single plain para becomes a NEW ¶ (A1/A5). The last-para→suffix merge
          // for the multi-¶ mid case (A6) is handled by cleanupTrailingBlockPara.
          var insSimpleInline = (content.length === 1 && blocks.length === 1 && blocks[0].type === "paragraph"
            && !(content[0] && content[0].GetClassType && content[0].GetClassType() === "table"));
          if (insSimpleInline && !insCaretAtEnd) {
            appendSelSentinel(content[0]); useSentinelSel = true;
            doc.InsertContent(content, true);
            // useSentinelSel -> sentinel-based post-selection (robust vs run-boundary positions)
          } else {
            prepareFirstBlockForMerge(); // §5bis: Cas A inline-style OR Cas B spacer
            doc.InsertContent(content);
            useRefSelection = true;
            cleanupTrailingBlockPara(); // §5bis: drop empty trailing ¶, keep a real split
            if (leadSpacerInserted) cleanupLeadingSpacer(); // §5bis Cas B
          }

          // Post-InsertContent: remove unselected rows/columns from inserted tables.
          // Uses the clone reference directly (now in the document after InsertContent).
          for (var ptr = 0; ptr < pendingTableReductions.length; ptr++) {
            try {
              var reduction = pendingTableReductions[ptr];
              var redTable = reduction.clone;
              var redSelRows = {};
              var redSelCols = {};
              for (var rsc = 0; rsc < reduction.selectedCellCoords.length; rsc++) {
                redSelRows[reduction.selectedCellCoords[rsc].r] = true;
                redSelCols[reduction.selectedCellCoords[rsc].c] = true;
              }
              // Remove unselected rows (reverse order to preserve indices)
              // OO API: RemoveRow(oCell) takes a cell reference, not an index
              var redRowCount = redTable.GetRowsCount();
              for (var rrr = redRowCount - 1; rrr >= 0; rrr--) {
                if (!redSelRows[rrr]) {
                  var rrCell = redTable.GetCell(rrr, 0);
                  if (rrCell) redTable.RemoveRow(rrCell);
                }
              }
              // Remove unselected columns (reverse order)
              var redFirstRow = redTable.GetRow(0);
              if (redFirstRow) {
                var redColCount = redFirstRow.GetCellsCount();
                for (var rccc = redColCount - 1; rccc >= 0; rccc--) {
                  if (!redSelCols[rccc]) {
                    var rcCell = redTable.GetCell(0, rccc);
                    if (rcCell) redTable.RemoveColumn(rcCell);
                  }
                }
              }
            } catch (e) {
              // Table reduction failed — table keeps all rows/columns
            }
          }
        } else {
          // Replace mode
          // Same guard as insert: blocks[0] is the SCRIBE-TABLE placeholder ¶, but
          // content[0] may be a substituted TABLE clone (full-table Replace, T3).
          // Inline mode over a full-table selection only clears the first cell — must
          // use block mode for a table.
          var isSimpleInline = (content.length === 1 && blocks.length === 1 && blocks[0].type === "paragraph"
            && !(content[0] && content[0].GetClassType && content[0].GetClassType() === "table"));
          if (isSimpleInline) {
            // Single paragraph: inline mode merges into existing paragraph
            appendSelSentinel(content[0]); useSentinelSel = true;
            doc.InsertContent(content, true);
          } else {
            // Multi-paragraph: block mode to keep paragraph separation. OO splits
            // the host ¶ at the (collapsed, post-delete) selection point; the right
            // remainder becomes a trailing ¶. §5bis: drop it only if empty (edge
            // insertion), else KEEP it — that is the split's right half, preserving
            // the host style AND the suffix's own run formatting (no plain-text
            // rebuild, no leaked \r).
            prepareFirstBlockForMerge(); // §5bis: Cas A inline-style OR Cas B spacer
            doc.InsertContent(content);
            useRefSelection = true; // block mode preserves paragraph refs
            cleanupTrailingBlockPara();
            if (leadSpacerInserted) cleanupLeadingSpacer(); // §5bis Cas B
          }
        }

        // ── Post-injection selection ──
        //
        // Two distinct strategies are needed because InsertContent behaves
        // differently in inline vs block mode:
        //
        // 1) selectByRefs — used for block-mode insert and block-mode replace.
        //    InsertContent in block mode keeps each paragraph as a separate
        //    document element, so the JS object references in content[] remain
        //    valid after insertion. We can call GetRange() on them directly.
        //
        // 2) selectByPositions — used for inline-mode replace (single paragraph).
        //    InsertContent(content, true) merges the runs INTO the existing
        //    paragraph, destroying the original object references. content[0]
        //    no longer maps to a standalone document element, so GetRange()
        //    on it is unreliable. Instead we use numeric character positions
        //    (preSelStart + text length) to build the selection range.
        //
        // Why not unify?
        //  - Position-based is fragile for multi-paragraph / block content:
        //    headings, lists, and paragraph separators introduce invisible
        //    position markers that make length arithmetic unreliable.
        //  - Ref-based cannot work after an inline merge because the refs
        //    are absorbed into the host paragraph.
        // So we pick the right tool for each insertion mode.

        function selectByRefs(doc, content, mode, preSelStart) {
          // First real content paragraph (block mode, both insert and replace).
          // §5bis Cas B unshifts a host-styled spacer at content[0] (absorbed into
          // the host's left half), so the first *real* block is content[1] then.
          var selectFirst = leadSpacerInserted ? content[1] : content[0];
          var selectLast = content[content.length - 1];
          if (!selectFirst || !selectLast) return;

          var startRange;
          if (mode === "insert" && !firstParaMergedInline) {
            startRange = selectFirst.GetRange(0, 0);
          } else {
            // Block-mode replace, OR a block-mode insert whose 1st plain block merges
            // into the host prefix (§5bis A6): OO merges content[0] with the text that
            // precedes the insertion point, so content[0].GetRange(0,0) starts too early
            // (it covers the surviving host prefix). Use the saved pre-insertion position
            // — the merge junction — instead. Consistent with the inline path (A2/A4),
            // which also anchors the selection start at preSelStart.
            startRange = doc.GetRange(preSelStart, preSelStart);
          }

          var endRange;
          if (mergedTrailingLen > 0) {
            // Trailing host text was merged into selectLast (§5bis A6) → end the
            // selection at the junction so the surviving host suffix stays out.
            // Anchor on the REAL start of the first appended run. The former
            // `selectLast.GetEndPos() - mergedTrailingLen` is arithmetic in OO
            // position units, which count run boundaries — including the empty-run
            // litter the inject paths leave in VARYING amounts — so it landed one
            // unit past the last run (the ¶ mark slot, filled by the suffix's first
            // char once appended) and selected « Second e ». Replace only looked
            // right because it carried an empty run just before the suffix whose
            // extra unit absorbed the error. Keep the arithmetic as a fallback.
            endRange = null;
            if (mergedTrailingRunRef && mergedTrailingRunRef.GetRange) {
              // Live range object → composes with ExpandTo across a cell boundary,
              // which an absolute doc.GetRange(int,int) does not (L#2).
              try { endRange = mergedTrailingRunRef.GetRange(0, 0); } catch (eMr) {}
            }
            if (!endRange) {
              var adjEnd = selectLast.GetRange().GetEndPos() - mergedTrailingLen;
              endRange = doc.GetRange(adjEnd, adjEnd);
            }
          } else {
            endRange = selectLast.GetRange();
          }

          if (startRange && endRange) {
            var fullRange = startRange.ExpandTo(endRange);
            if (fullRange) fullRange.Select();
          }
        }

        // Robust inline post-selection: the sentinel run appended to the inline content
        // is now a live run in the host ¶. Fresh-scan for it (stale content refs are
        // absorbed by the inline merge; only freshly-read elements give correct ranges),
        // take its REAL start position as the selection end, delete it, then select
        // [preSelStart .. sentinelStart]. Both ends are real OO positions in the same
        // post-insert doc, so the selection is exact regardless of run/style boundaries.
        function selectBySentinel(doc, startPos, sentinel) {
          try {
            var paras = doc.GetAllParagraphs();
            for (var p = 0; p < paras.length; p++) {
              var para = paras[p];
              var ec = para && para.GetElementsCount ? para.GetElementsCount() : 0;
              for (var e = 0; e < ec; e++) {
                var el = para.GetElement(e);
                if (el && el.GetText && el.GetText() === sentinel) {
                  var rg = el.GetRange ? el.GetRange() : null;
                  var sentStart = rg ? rg.GetStartPos() : -1;
                  try { el.Delete(); } catch (ex) {}
                  if (sentStart < 0) return false;
                  var sel = doc.GetRange(startPos, sentStart);
                  if (sel) { sel.Select(); return true; }
                  return false;
                }
              }
            }
          } catch (e) {}
          return false;
        }

        function selectByPositions(doc, preSelStart, totalTextLen, mergedTrailingLen) {
          // Simple arithmetic: the injected text starts at preSelStart and
          // spans totalTextLen characters. +2 compensates an OO logical
          // position offset (paragraph start marker).
          var selTextLen = totalTextLen - mergedTrailingLen;
          if (selTextLen <= 0) return;
          var selectRange = doc.GetRange(preSelStart, preSelStart + selTextLen + 2);
          if (selectRange) selectRange.Select();
        }

        try {
          if (useRefSelection) {
            selectByRefs(doc, content, mode, preSelStart);
          } else if (useSentinelSel && selectBySentinel(doc, preSelStart, SCRIBE_SEL_SENT)) {
            // selected via sentinel (inline insert/replace) — exact, style-agnostic
          } else {
            selectByPositions(doc, preSelStart, totalTextLen, mergedTrailingLen);
          }
        } catch (e) {
          // Selection failed — content is still injected, graceful degradation
        }

        // ── Post-selection: recreate footnotes ──
        // Done AFTER selection to avoid disrupting cursor/selection state.
        // processPendingFootnotes uses Select() + AddFootnote() which move the cursor.
        if (pendingFootnotes.length > 0) {
          processPendingFootnotes();
        }
      }

      // Post-operation: select all modified content for partial table Replace.
      // Covers both table cells (modified in-place) and text paragraphs (mixed content).
      if (mode === "replace" && partialTableInfo) {
        try {
          var postSelStart = -1;
          var postSelEnd = -1;

          // Only compute cell bounds for non-mixed (pure table) Replace.
          if (!skipContentAndInsert) {
          var postAllTables = doc.GetAllTables();
          for (var ptSelIdx in partialTableInfo) {
            if (!partialTableInfo.hasOwnProperty(ptSelIdx)) continue;
            var ptSelCells = partialTableInfo[ptSelIdx];
            if (ptSelCells.length === 0) continue;
            var ptSelDocIdx = tableDocIndices[parseInt(ptSelIdx)];
            var ptSelTable = (ptSelDocIdx !== undefined && ptSelDocIdx < postAllTables.length) ? postAllTables[ptSelDocIdx] : null;
            if (!ptSelTable) continue;
            var minR = ptSelCells[0].r, maxR = ptSelCells[0].r;
            var minC = ptSelCells[0].c, maxC = ptSelCells[0].c;
            for (var psi = 1; psi < ptSelCells.length; psi++) {
              if (ptSelCells[psi].r < minR) minR = ptSelCells[psi].r;
              if (ptSelCells[psi].r > maxR) maxR = ptSelCells[psi].r;
              if (ptSelCells[psi].c < minC) minC = ptSelCells[psi].c;
              if (ptSelCells[psi].c > maxC) maxC = ptSelCells[psi].c;
            }
            var topLeftCell = ptSelTable.GetCell(minR, minC);
            var botRightCell = ptSelTable.GetCell(maxR, maxC);
            if (topLeftCell && botRightCell) {
              var tlContent = topLeftCell.GetContent();
              var brContent = botRightCell.GetContent();
              if (tlContent && tlContent.GetElementsCount() > 0 && brContent && brContent.GetElementsCount() > 0) {
                var tlPara = tlContent.GetElement(0);
                var brPara = brContent.GetElement(brContent.GetElementsCount() - 1);
                var tlRange = tlPara ? tlPara.GetRange() : null;
                var brRange = brPara ? brPara.GetRange() : null;
                if (tlRange) {
                  var tlPos = tlRange.GetStartPos();
                  if (postSelStart === -1 || tlPos < postSelStart) postSelStart = tlPos;
                }
                if (brRange) {
                  var brPos = brRange.GetEndPos();
                  if (brPos > postSelEnd) postSelEnd = brPos;
                }
              }
            }
            break;
          }
          } // end if (!skipContentAndInsert)

          // Select the modified cell range (pure table Replace only).
          if (!skipContentAndInsert && postSelStart >= 0 && postSelEnd > postSelStart) {
            var postRange = doc.GetRange(postSelStart, postSelEnd);
            if (postRange) postRange.Select();
          }

          // Cross-boundary mixed Replace (skipContentAndInsert): re-establish a
          // spanning selection over the INJECTED region only. Re-fetch every touched
          // element FRESH — cells via GetCell, text ¶s via their XSEL_A/XSEL_B
          // sentinel bracket — then ExpandTo the global extremes' union. We NEVER use
          // doc.GetRange(int,int) ACROSS a cell boundary (that is exactly L#2:
          // integer positions don't compose cross-cell); the only integer ranges we
          // build are WITHIN a single ¶ (the injected span), and ExpandTo of two live
          // range objects composes across the boundary (probe-confirmed post-mutation).
          if (skipContentAndInsert) {
            // 1. locate the sentinel pair in each modified text ¶. injStartPre points
            //    just after XSEL_A (first injected char); injEndPre just before XSEL_B
            //    (last injected char). Positions are PRE-deletion.
            var xSpans = [];   // { injStartPre, injEndPre }
            var xSents = [];   // { run, pos, len } for every sentinel, for compensation
            var xAllParas = doc.GetAllParagraphs();
            for (var xpi = 0; xpi < xAllParas.length; xpi++) {
              var xPara = xAllParas[xpi];
              var xEc = (xPara && xPara.GetElementsCount) ? xPara.GetElementsCount() : 0;
              var xA = null, xB = null;
              for (var xei = 0; xei < xEc; xei++) {
                var xEl = xPara.GetElement(xei);
                var xTxt = (xEl && xEl.GetText) ? xEl.GetText() : "";
                if (xTxt === SCRIBE_XSEL_A) xA = xEl;
                else if (xTxt === SCRIBE_XSEL_B) xB = xEl;
              }
              if (xA && xB) {
                var xAr = xA.GetRange(), xBr = xB.GetRange();
                xSpans.push({ injStartPre: xAr.GetEndPos(), injEndPre: xBr.GetStartPos() });
                xSents.push({ run: xA, pos: xAr.GetStartPos(), len: xAr.GetEndPos() - xAr.GetStartPos() });
                xSents.push({ run: xB, pos: xBr.GetStartPos(), len: xBr.GetEndPos() - xBr.GetStartPos() });
              }
            }
            // 2. delete every sentinel (content is now final & clean).
            for (var xsd = 0; xsd < xSents.length; xsd++) {
              try { xSents[xsd].run.Delete(); } catch (e) {}
            }
            // compensate a PRE-deletion position for all sentinels removed before it.
            function xCompensate(pos) {
              var shift = 0;
              for (var i = 0; i < xSents.length; i++) { if (xSents[i].pos < pos) shift += xSents[i].len; }
              return pos - shift;
            }

            // 3. collect fresh candidate ranges (all consistent, post-deletion).
            var xCand = [];
            // cells — GetCell is always fresh, no compensation needed.
            var xTables = doc.GetAllTables();
            for (var xti in partialTableInfo) {
              if (!partialTableInfo.hasOwnProperty(xti)) continue;
              var xCells = partialTableInfo[xti];
              if (!xCells || !xCells.length) continue;
              var xDi = tableDocIndices[parseInt(xti)];
              var xTb = (xDi !== undefined && xDi < xTables.length) ? xTables[xDi] : null;
              if (!xTb) continue;
              for (var xci = 0; xci < xCells.length; xci++) {
                var xCl = xTb.GetCell(xCells[xci].r, xCells[xci].c);
                if (!xCl) continue;
                var xCont = xCl.GetContent();
                if (!xCont || xCont.GetElementsCount() === 0) continue;
                var xP0 = xCont.GetElement(0);
                var xPN = xCont.GetElement(xCont.GetElementsCount() - 1);
                var xR0 = (xP0 && xP0.GetRange) ? xP0.GetRange() : null;
                var xRN = (xPN && xPN.GetRange) ? xPN.GetRange() : null;
                if (xR0) xCand.push({ s: xR0.GetStartPos(), e: xR0.GetEndPos(), r: xR0 });
                if (xRN) xCand.push({ s: xRN.GetStartPos(), e: xRN.GetEndPos(), r: xRN });
              }
            }
            // text ¶s — injected span via compensated positions (WITHIN one ¶, safe).
            for (var xsp = 0; xsp < xSpans.length; xsp++) {
              var xS = xCompensate(xSpans[xsp].injStartPre);
              var xE = xCompensate(xSpans[xsp].injEndPre);
              if (xE > xS) {
                var xr = doc.GetRange(xS, xE);
                if (xr) xCand.push({ s: xS, e: xE, r: xr });
              }
            }

            // 4. ExpandTo the extreme range objects (min start .. max end) and Select.
            var xMin = null, xMax = null;
            for (var xc = 0; xc < xCand.length; xc++) {
              if (!xMin || xCand[xc].s < xMin.s) xMin = xCand[xc];
              if (!xMax || xCand[xc].e > xMax.e) xMax = xCand[xc];
            }
            if (xMin && xMax && xMin.r && xMax.r && xMin.r.ExpandTo) {
              var xRng = xMin.r.ExpandTo(xMax.r);
              if (xRng && xRng.Select) xRng.Select();
            }
          }
        } catch (e) {
          // Selection failed — not critical, document content is correct
        }
      }

      // --- Live-render fix: warm the editor image cache for injected media ---
      // getLocalImagePath -> AscCommon.sendImgUrls only registers the media
      // path->url mapping in g_oDocumentUrls; it does NOT decode the bitmap into the
      // editor's image render cache (g_image_loader), and — unlike document open,
      // which ends with asyncImagesDocumentEndLoaded — nothing here triggers the
      // post-load redraw. Result: a freshly FromJSON+AddDrawing'd image lays out but
      // paints BLANK until a reload re-loads media from the docx.
      //
      // We must NOT use g_image_loader.LoadImage(): its onload calls
      // asc_docs_api.asyncImageEndLoaded, which — outside the interactive
      // insert-image flow — runs StartAction + AddInlineImage(50,50) + FinalizeAction,
      // i.e. it INSERTS a bogus ~50mm image as a SEPARATE undo point (word/api.js).
      // Instead use LoadImagesWithCallback (decodes into the render cache, fires only
      // our callback — no insert), then CheckRasterImageOnScreen to repaint the pages
      // showing that raster (the exact path asyncImageEndLoadedBackground uses).
      // src must be getFullImageSrc2(blipPath): the drawing's rasterImageId is the
      // media path we set, and CheckRasterImageOnScreen compares getFullImageSrc2 of
      // each on-page raster id against this src.
      // SIZE: the injected drawing lays out at the extent stored in its FromJSON
      // spPr.xfrm (= the source image's saved size); this warm pass only DECODES +
      // REPAINTS the existing raster, it never resizes — contrast the LoadImage path
      // above, which would have inserted a fresh bogus 50mm image.
      // Guarded: if the editor internals are unreachable, injection is unaffected
      // (the image still appears on reload, the pre-fix behaviour).
      try {
        if (scribeInjectedRasterIds.length > 0 &&
            typeof AscCommon !== "undefined" &&
            AscCommon.g_image_loader && AscCommon.getFullImageSrc2) {
          var _loader = AscCommon.g_image_loader;
          var _wApi = _loader.Api;
          var _wDD = (_wApi && _wApi.WordControl) ? _wApi.WordControl.m_oDrawingDocument : null;
          var _srcs = [];
          for (var wImg = 0; wImg < scribeInjectedRasterIds.length; wImg++) {
            if (scribeInjectedRasterIds[wImg]) {
              // getFullImageSrc2(rasterId) resolves the prefix-stripped id to the real
              // media URL (getImageUrl re-adds the "media/" prefix). This is also the
              // exact src CheckRasterImageOnScreen compares against per on-page raster.
              _srcs.push(AscCommon.getFullImageSrc2(scribeInjectedRasterIds[wImg]));
            }
          }
          if (_srcs.length > 0 && _loader.LoadImagesWithCallback) {
            _loader.LoadImagesWithCallback(_srcs, function() {
              try {
                if (_wDD && _wDD.CheckRasterImageOnScreen) {
                  for (var cri = 0; cri < _srcs.length; cri++) {
                    _wDD.CheckRasterImageOnScreen(_srcs[cri]);
                  }
                }
              } catch (eRepaint) {}
            }, null, false);
            log("warming render cache for " + _srcs.length + " injected image(s)");
          }
        }
      } catch (eWarm) {
        log("image-cache warm failed (image will still appear on reload): " + eWarm);
      }

      // All text + images were injected inside this single callCommand (images via
      // FromJSON + AddDrawing from the pre-registered media map) — nothing is deferred.
      return;
    }, false, scribeInjectRecalc, function(ret) {
      callbackFired = true;
      clearTimeout(fallbackTimer);
      log("Builder injection complete (" + mode + ")");
      pasteInProgress = false;
    });
    }  // end runInjection

    // ---- Image media pre-pass (capture full ToJSON + register media) ----
    // Before the injection callCommand runs, capture each referenced image's FULL
    // drawing ToJSON (read-only, no history point / no repaint) and register its
    // media via the stock getLocalImagePath plugin method (async, doc-server
    // upload, no doc mutation). Only once ALL registrations return (ES5 counter
    // barrier) do we start the injection callCommand, passing the
    // name -> { json, rasterId } map through Asc.scope.imageMediaMap.
    if (!referencedImageNames || referencedImageNames.length === 0) {
      Asc.scope.imageMediaMap = "{}";
      runInjection();
    } else {
      Asc.scope._captureNames = JSON.stringify(referencedImageNames);
      // Read-only capture callCommand: serialize the referenced drawings BEFORE
      // InsertContent destroys them. Returns [{name, json, dataUrl}].
      window.Asc.plugin.callCommand(function() {
        var doc = Api.GetDocument();
        var names = [];
        try { names = JSON.parse(Asc.scope._captureNames || "[]"); } catch (e) { names = []; }

        // Build a name -> ApiDrawing index by scanning the whole document
        // (top-level paragraphs + table cells) — same scan the injection uses.
        var drawingIndex = {};
        var allParas = doc.GetAllParagraphs();
        for (var dp = 0; dp < allParas.length; dp++) {
          var dpDrawings = allParas[dp].GetAllDrawingObjects();
          if (!dpDrawings) continue;
          for (var dd = 0; dd < dpDrawings.length; dd++) {
            var dpName = dpDrawings[dd].GetName();
            if (dpName && dpName.indexOf("scribe-img-") === 0) {
              drawingIndex[dpName] = dpDrawings[dd];
            }
          }
        }
        var allDocTables = doc.GetAllTables();
        for (var dit = 0; dit < allDocTables.length; dit++) {
          var ditRows = allDocTables[dit].GetRowsCount();
          for (var ditr = 0; ditr < ditRows; ditr++) {
            var ditRow = allDocTables[dit].GetRow(ditr);
            for (var ditc = 0; ditc < ditRow.GetCellsCount(); ditc++) {
              var ditCell = allDocTables[dit].GetCell(ditr, ditc);
              if (!ditCell) continue;
              var ditContent = ditCell.GetContent();
              if (!ditContent) continue;
              for (var dite = 0; dite < ditContent.GetElementsCount(); dite++) {
                var ditElem = ditContent.GetElement(dite);
                var ditDrawings = ditElem.GetAllDrawingObjects ? ditElem.GetAllDrawingObjects() : null;
                if (!ditDrawings) continue;
                for (var ditd = 0; ditd < ditDrawings.length; ditd++) {
                  var ditName = ditDrawings[ditd].GetName();
                  if (ditName && ditName.indexOf("scribe-img-") === 0) {
                    drawingIndex[ditName] = ditDrawings[ditd];
                  }
                }
              }
            }
          }
        }

        // Capture the FULL ToJSON + a SERVER-FETCHABLE source for each referenced
        // image. The `uploadSrc` we return is handed to getLocalImagePath ->
        // AscCommon.sendImgUrls on the plugin side, which UPLOADS it to the doc server
        // (the "imgurls" command downloads/decodes the bytes into a real media part and
        // returns a byte-backed media id). For that upload to yield BYTES the input MUST
        // be fetchable: a `data:` URL (decoded server-side) or a full `http(s)://` URL
        // (downloaded server-side).
        //
        // ToJSON's blipFill.rasterImageId (getBase64Data, Format.js) is a re-encoded
        // `data:` URL ONLY when the source image is loaded Complete in the render cache
        // at capture time; for an image not yet decoded it returns the BARE media id
        // ("image1.png") unchanged. A bare relative id is NOT fetchable by the server ->
        // sendImgUrls would register a byte-LESS media entry. So we make the upload source
        // fetchable (below), so the doc server holds REAL bytes for the media part.
        //
        // NECESSARY-BUT-NOT-SUFFICIENT — the bytes must exist server-side for x2t to write
        // them at save, but byte-presence was NOT the root cause of the blank-on-reopen
        // bug. The .5-diag build proved a byte-backed id (server HAD the bytes) STILL saved
        // degenerate; the real cause was the injection callCommand running with
        // recalculate=false, which skipped the co-editing TRANSMISSION of the blipFill
        // change (see scribeInjectRecalc, ~l.590, and debug: inject-blip-lost-at-save root
        // cause (c)). This pre-pass and recalculate=true are BOTH required: bytes-on-server
        // HERE + change-transmitted THERE.
        //
        // Fix (this pre-pass): if the ToJSON rasterImageId is NOT a self-contained `data:`
        // URL, resolve the bare media id to its full doc-server http URL via
        // getFullImageSrc2 so the server can DOWNLOAD real bytes. (This non-`data:` branch
        // is ALSO the CONTAMINATION path: re-extracting an ALREADY-injected image, whose
        // blip is now a media ref, not a data-URL — the http resolution lets it round-trip
        // again; if resolution fails, the bare id is kept and the image is skipped
        // gracefully at injection, injectDrawingInto's no-media skip.)
        function imageSpecFor(name) {
          var d = drawingIndex[name];
          if (!d) return null;
          try {
            var jsonStr = d.ToJSON();
            var j = JSON.parse(jsonStr);
            var bf = j && j.graphic ? j.graphic.blipFill : null;
            var rasterId = bf ? bf.rasterImageId : null;
            if (!rasterId) return null;
            var uploadSrc = rasterId;
            if (rasterId.indexOf("data:") !== 0) {
              // Bare media id (or any non-data src): resolve to the full server URL so
              // sendImgUrls can fetch the bytes. getFullImageSrc2 re-adds the "media/"
              // prefix and maps to the registered doc-server URL.
              try {
                if (typeof AscCommon !== "undefined" && AscCommon.getFullImageSrc2) {
                  var full = AscCommon.getFullImageSrc2(rasterId);
                  if (full && full.indexOf("data:") !== 0 &&
                      (full.indexOf("http:") === 0 || full.indexOf("https:") === 0 ||
                       full.indexOf("blob:") === 0 || full.indexOf("file:") === 0)) {
                    uploadSrc = full;
                  }
                }
              } catch (eFull) {}
            }
            return {
              name: name,
              json: jsonStr,
              dataUrl: uploadSrc
            };
          } catch (e) { return null; }
        }

        var captured = [];
        for (var ni = 0; ni < names.length; ni++) {
          var spec = imageSpecFor(names[ni]);
          if (spec) captured.push(spec);
        }
        return JSON.stringify(captured);
      }, false, false, function(capJson) {
        var captured = [];
        try { captured = JSON.parse(capJson || "[]"); } catch (e) { captured = []; }
        if (!captured || captured.length === 0) {
          Asc.scope.imageMediaMap = "{}";
          runInjection();
          return;
        }
        // Async media registration: one getLocalImagePath per image, joined by an
        // ES5 counter barrier. On error, record the image WITHOUT a rasterId so the
        // injection skips it (never writes an empty rasterImageId). A safety timeout
        // guarantees we never hang if a callback is dropped.
        var mediaMap = {};
        var remaining = captured.length;
        var proceeded = false;
        function proceed() {
          if (proceeded) return;
          proceeded = true;
          Asc.scope.imageMediaMap = JSON.stringify(mediaMap);
          runInjection();
        }
        var barrierTimer = setTimeout(function() {
          log("getLocalImagePath barrier timeout -- proceeding with partial media map");
          proceed();
        }, 8000);
        function oneDone() {
          remaining--;
          if (remaining <= 0) {
            clearTimeout(barrierTimer);
            proceed();
          }
        }
        for (var ci = 0; ci < captured.length; ci++) {
          (function(cap) {
            try {
              // cap.dataUrl is a SERVER-FETCHABLE source (a `data:` URL, or the resolved
              // full doc-server http URL for a bare media id — see imageSpecFor).
              // getLocalImagePath -> sendImgUrls uploads it so the server creates a
              // media part WITH bytes; ret.url is that part's byte-backed id. The bytes
              // must exist on the server so that, post-injection, _afterEvalCommand ->
              // Check_LoadingDataBeforePrepaste keeps this id in the reassign map and
              // Reassign_ImageUrls re-registers the blip for the co-editing save (see the
              // scribeInjectRecalc note in runInjection).
              window.Asc.plugin.executeMethod("getLocalImagePath", [cap.dataUrl], function(ret) {
                if (ret && ret.error === false && ret.path) {
                  // Use ret.url (= g_oDocumentUrls.imagePath2Local(path), the media
                  // path with the "media/" prefix STRIPPED) as the blip rasterImageId.
                  // ret.path keeps the prefix, and getFullImageSrc2 re-adds it via
                  // getImageUrl -> getUrl("media/"+id), so a prefixed id resolves to
                  // undefined and the drawing paints BLANK until reload (verified live:
                  // WARMDIAG getImageUrl=undefined). The stripped form is OO's normal
                  // rasterImageId, so it resolves at render AND maps back at save.
                  mediaMap[cap.name] = { json: cap.json, rasterId: ret.url || ret.path };
                } else {
                  mediaMap[cap.name] = { json: cap.json, failed: true };
                  log("getLocalImagePath failed for " + cap.name);
                }
                oneDone();
              });
            } catch (e) {
              mediaMap[cap.name] = { json: cap.json, failed: true };
              log("getLocalImagePath threw for " + cap.name);
              oneDone();
            }
          })(captured[ci]);
        }
      });
    }
  }

  // Rich text paste pipeline:
  // 1. callCommand: read adjacent chars around selection, detect if spaces needed
  //    For insert mode: collapse cursor to end of selection first
  // 2. PasteHtml: paste HTML with smart spaces prepended/appended
  //    Replace mode: replaces the selection. Insert mode: inserts at cursor (after selection).
  // This produces a single undo point (PasteHtml only — the read-only callCommand doesn't count).
  // NOTE: post-paste selection of inserted content is not yet implemented (OO returns
  // inconsistent cursor positions after PasteHtml — see phase13-paste-select.md).
  function pasteHtml(html, mode) {
    pasteInProgress = true;
    Asc.scope._mode = mode || "replace";

    // Step 1: detect adjacent chars + position cursor for insert
    window.Asc.plugin.callCommand(function() {
      var doc = Api.GetDocument();
      var range = doc.GetRangeBySelect();
      if (!range) return null;
      var selStart = range.GetStartPos();
      var selEnd = range.GetEndPos();
      var result = { spaceBefore: false, spaceAfter: false };
      var isInsert = Asc.scope._mode === "insert";
      var WS = /[\s\n\r\t\u00A0]/;

      if (isInsert) {
        // Check last char of selection (before) and first char after selection (after)
        var beforeRange = doc.GetRange(selEnd - 5 >= 0 ? selEnd - 5 : 0, selEnd);
        var beforeText = beforeRange ? beforeRange.GetText() : "";
        var beforeChar = beforeText.length > 0 ? beforeText.charAt(beforeText.length - 1) : "";
        if (beforeChar && !WS.test(beforeChar)) result.spaceBefore = true;

        var afterRange = doc.GetRange(selEnd, selEnd + 5);
        var afterText = afterRange ? afterRange.GetText() : "";
        var afterChar = afterText.length > 0 ? afterText.charAt(0) : "";
        if (afterChar && !WS.test(afterChar)) result.spaceAfter = true;

        // Collapse cursor to end of selection
        var cursorRange = doc.GetRange(selEnd, selEnd);
        if (cursorRange) cursorRange.Select();
      } else {
        // Check char before selection and char after selection
        if (selStart > 0) {
          var beforeRange2 = doc.GetRange(selStart - 5 >= 0 ? selStart - 5 : 0, selStart);
          var beforeText2 = beforeRange2 ? beforeRange2.GetText() : "";
          var beforeChar2 = beforeText2.length > 0 ? beforeText2.charAt(beforeText2.length - 1) : "";
          if (beforeChar2 && !WS.test(beforeChar2)) result.spaceBefore = true;
        }
        var afterRange2 = doc.GetRange(selEnd, selEnd + 5);
        var afterText2 = afterRange2 ? afterRange2.GetText() : "";
        var afterChar2 = afterText2.length > 0 ? afterText2.charAt(0) : "";
        if (afterChar2 && !WS.test(afterChar2)) result.spaceAfter = true;
      }
      return JSON.stringify(result);
    }, false, false, function(prepResult) {
      var prep = prepResult ? JSON.parse(prepResult) : null;
      if (!prep) { pasteInProgress = false; return; }

      // Step 2: build HTML with smart spaces and paste
      var spaceBefore = prep.spaceBefore ? "&nbsp;" : "";
      var spaceAfter = prep.spaceAfter ? "&nbsp;" : "";
      var finalHtml = spaceBefore + html + spaceAfter;
      var spacesLog = (prep.spaceBefore ? "before " : "") + (prep.spaceAfter ? "after" : "");
      log("PasteHtml (" + (mode || "replace") + ")" + (spacesLog ? " spaces=" + spacesLog : ""));
      window.Asc.plugin.executeMethod("PasteHtml", [finalHtml], function() {
        pasteInProgress = false;
      });
    });
  }

  // ---- handleIntentResponse: apply document modification from response ----
  // Routes: md field -> Builder API path, html field -> PasteHtml, text -> plain fallback
  function handleIntentResponse(msg) {
    if (msg.action === "replace" || msg.action === "insert") {
      // Store partialTableInfo and tableSnapshots from React respond() — authoritative copy
      if (msg.data && msg.data.partialTableInfo) {
        lastPartialTableInfo = msg.data.partialTableInfo;
      }
      if (msg.data && msg.data.tableSnapshots) {
        lastTableSnapshots = msg.data.tableSnapshots;
      }
      if (msg.data && msg.data.md) {
        // Builder API path (primary) with PasteHtml fallback
        log(msg.action + " (Builder API)");
        try {
          buildAndInject(msg.data.md, msg.action, msg.data.html || null);
        } catch (e) {
          log("Builder injection failed: " + e.message + " -- falling back to PasteHtml");
          if (msg.data.html) {
            pasteHtml(msg.data.html, msg.action);
          } else {
            window.Asc.plugin.executeMethod("PasteText", [msg.data.text || ""]);
          }
        }
      } else if (msg.data && msg.data.html) {
        // PasteHtml path (existing fallback)
        log(msg.action + " (PasteHtml)");
        pasteHtml(msg.data.html, msg.action);
      } else {
        // Plain text fallback (existing)
        log(msg.action + " (plain text)");
        if (msg.action === "replace") {
          window.Asc.plugin.executeMethod("PasteText", [msg.data.text || ""]);
        } else {
          insertAfterWithText(msg.data.text || "");
        }
      }
    } else if (msg.action === "cancel") {
      log("Intent cancelled -- no document modification");
    }
  }

  // Insert after selection (HTML): collapse cursor to end of selection, then PasteHtml.
  function insertAfterWithHtml(newHtml) {
    pasteHtml(newHtml, "insert");
  }

  // Insert after selection (plain text fallback): InsertContent replaces the
  // selection, so we re-create the original paragraphs and append the new text.
  function insertAfterWithText(newText) {
    Asc.scope.textToInsert = newText;
    Asc.scope.originalLines = lastSelectedText.split("\n");
    window.Asc.plugin.callCommand(function() {
      var oDocument = Api.GetDocument();
      var content = [];
      // Re-create original text paragraphs (preserves paragraph structure)
      for (var i = 0; i < Asc.scope.originalLines.length; i++) {
        var p = Api.CreateParagraph();
        p.AddText(Asc.scope.originalLines[i]);
        content.push(p);
      }
      // Add new text as paragraphs after original
      var insertLines = Asc.scope.textToInsert.split("\n");
      for (var j = 0; j < insertLines.length; j++) {
        var pNew = Api.CreateParagraph();
        pNew.AddText(insertLines[j]);
        content.push(pNew);
      }
      oDocument.InsertContent(content);
    }, false, false, function() {
      log("InsertContent completed (original preserved + insert after)");
    });
  }

  // ---- Response message listener ----
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.type !== "cozy-bridge:response" || msg.version !== 1) return;

    var pending = pendingIntents[msg.intentId];
    if (!pending) return;

    delete pendingIntents[msg.intentId];
    log("Response: " + msg.action);

    // Resolve the Promise if available
    if (pending.resolve) {
      pending.resolve({ action: msg.action, result: msg.data });
    }

    // Always handle the response for document modification
    if (msg.status === "ok") {
      handleIntentResponse(msg);
    }
  });

  // ---- PANEL_ACTION listener (host -> plugin, one-way) ----
  // The Scribe side panel sends PANEL_ACTION cozy-bridge:intent messages when
  // the user clicks Replace/Insert on an AI chat message. Unlike the response
  // path, there is no pending intent to look up — the payload carries the
  // action and text directly, and we route it through the same
  // handleIntentResponse function used by the inline popover flow so both
  // paths produce identical document modifications (smart spacing, Builder
  // API, PasteHtml fallback, etc.).
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.type !== "cozy-bridge:intent" || msg.version !== 1) return;
    if (msg.action !== "PANEL_ACTION") return;

    var panelData = msg.data || {};
    var subAction = panelData.action;
    if (subAction !== "replace" && subAction !== "insert") {
      log("PANEL_ACTION ignored -- unknown sub-action: " + subAction);
      return;
    }

    log("PANEL_ACTION received: " + subAction);
    // Synthesize a response-shaped msg for handleIntentResponse. It only
    // reads .action and .data, so this is a faithful reuse with zero
    // behavioral drift from the inline popover path.
    handleIntentResponse({
      action: subAction,
      data: {
        text: panelData.text || "",
        html: panelData.html || null,
        md: panelData.md || null,
        partialTableInfo: panelData.partialTableInfo || null,
        tableSnapshots: panelData.tableSnapshots || null
      }
    });
  });

  // Inline-Scribe triggers must act on the CURRENT selection. But the enriched
  // markdown (lastEnrichedMd, sent to the LLM) is refreshed ONLY by the debounced
  // passive extraction, whose scheduling setTimeout is throttled in this background
  // iframe — so a quick select-then-trigger sent the PREVIOUS selection. Force a
  // fresh extraction HERE by calling the extraction callCommand DIRECTLY (no
  // setTimeout → not throttled → prompt callback) and cast AI_TEXT_ASSISTANT from
  // its callback, so the intent carries the up-to-date enrichedMd. Empty selection
  // → no cast (Scribe needs a selection); onEmpty lets the caller pick a fallback.
  function castScribeTriggerFresh(extraData, onEmpty) {
    window.Asc.scope.imgCounter = imageCounter;
    window.Asc.scope._fnCounter = footnoteCounter;
    window.Asc.scope._crCounter = crossRefCounter;
    window.Asc.scope._crMeta = {};
    window.Asc.scope._tReturnSnaps = (window.__scribeTestForce === true);
    window.Asc.scope.scribeExtractMode = "selection";
    function finish() {
      if (lastSelectedText && lastSelectedText.length > 0) {
        var data = buildEditIntentData();
        if (extraData) { for (var k in extraData) { if (extraData.hasOwnProperty(k)) data[k] = extraData[k]; } }
        castIntent("AI_TEXT_ASSISTANT", data);
      } else if (onEmpty) { onEmpty(); }
    }
    try {
      window.Asc.plugin.callCommand(buildScribeExtractionResult, false, false, function(resultJson) {
        try { onSelectionExtractResult(resultJson); } catch (e) {}
        finish();
      });
    } catch (e) { finish(); } // fall back to whatever the cache holds
  }

  // ---- Trigger-intent listener (host -> plugin) ----
  // Cozy Drive sends trigger-intent to ask the plugin to cast an AI_TEXT_ASSISTANT intent
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.type !== "cozy-bridge:trigger-intent") return;

    if (msg.action === "AI_TEXT_ASSISTANT") {
      log("Trigger-intent received, refreshing selection then casting AI_TEXT_ASSISTANT");
      castScribeTriggerFresh();
    }
  });

  // ---- Strip OO-internal CSS classes from extracted HTML ----
  // Based on official OO HTML plugin pattern -- removes class attributes
  // that contain OO-specific styling metadata not useful for AI processing
  function stripOoClasses(html) {
    return html.replace(/\s*class="[^"]*"/g, "");
  }

  // ---- Selection subscription (host tells plugin when to send SELECTION_CHANGED) ----
  // initOnSelectionChanged (config.json) makes OO call init() only when a
  // NON-EMPTY selection changes. That leaves two gaps the side panel must cover:
  //   #2 When the panel opens, OO won't re-fire init() for an already-present
  //      selection — so on subscribe we call init() once to extract+push it.
  //   #3 When the selection collapses to a bare cursor (empty), OO never fires
  //      init() — so a light read-only poll detects the non-empty -> empty
  //      transition and pushes an empty SELECTION_CHANGED to clear the panel.
  // A previous GetSelectedText poll was ruled out as the cause of the panel
  // focus-steal bug (removing it didn't fix it), so this read-only poll is
  // considered focus-safe; it never writes to the document.
  var selectionSubscribed = false;
  var selectionPollTimer = null;
  var lastPolledNonEmpty = false;

  function castEmptySelection() {
    lastSelectedText = "";
    lastEnrichedMd = "";
    lastTableSnapshots = null;
    lastTableAmbiguity = null;
    lastPartialTableInfo = null;
    lastSelectedHtml = "";
    castIntent("SELECTION_CHANGED", { text: "", html: null }, true);
  }

  function pollSelectionForClear() {
    try {
      window.Asc.plugin.executeMethod("GetSelectedText", [], function(txt) {
        var isEmpty = !txt || txt.length === 0;
        if (isEmpty) {
          // Only act on the non-empty -> empty transition; init() handles
          // non-empty selection changes (with full enriched extraction).
          if (lastPolledNonEmpty) {
            lastPolledNonEmpty = false;
            castEmptySelection();
          }
        } else {
          lastPolledNonEmpty = true;
        }
      });
    } catch (e) {
      // ignore transient API errors
    }
  }

  function startSelectionPoll() {
    if (selectionPollTimer) return;
    selectionPollTimer = setInterval(pollSelectionForClear, 400);
  }

  function stopSelectionPoll() {
    if (selectionPollTimer) {
      clearInterval(selectionPollTimer);
      selectionPollTimer = null;
    }
  }

  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.type !== "cozy-bridge:selection-subscribe") return;
    selectionSubscribed = !!msg.subscribe;
    log("Selection subscribe: " + selectionSubscribed);
    if (selectionSubscribed) {
      // #2: push the current selection now — init() won't re-fire just because
      // we subscribed. Guard with GetSelectedText first: init()'s extraction
      // returns the WHOLE paragraph when the selection is empty (a bare
      // cursor), so for an empty selection we send an explicit clear instead.
      lastPolledNonEmpty = false;
      try {
        window.Asc.plugin.executeMethod("GetSelectedText", [], function(txt) {
          if (txt && txt.length > 0) {
            lastPolledNonEmpty = true;
            window.Asc.plugin.init({});
          } else {
            castEmptySelection();
          }
        });
      } catch (e) { /* API not ready */ }
      startSelectionPoll();
    } else {
      stopSelectionPoll();
    }
  });

  // ---- On-demand whole-document extraction (v3.2-03, CTX-LLM-01) ----
  // Production channel (NOT gated by any dev/test hook): the host asks the plugin
  // to extract the WHOLE document as markdown via a dedicated request/response
  // message pair, correlated by reqId. This dedicated message type bypasses the
  // 1 MB cozy-bridge:intent cap (only :intent/:response are size-validated), so a
  // large document is neither rejected nor chunked.
  //   Request (host -> plugin):  { type: "cozy-bridge:extract-document", reqId }
  //   Reply   (plugin -> host):  { type: "cozy-bridge:document-extracted", reqId, md, error }
  // The reply has NO truncation field: the document is always returned in full
  // (D-02); all truncation/signalling is host-side (plan 02 applyBudget).
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.type !== "cozy-bridge:extract-document") return;
    var reqId = msg.reqId;
    try {
      // Seed the marker counters used by paragraphToMarkdown so image / footnote /
      // cross-ref names are stable within this single extraction.
      window.Asc.scope.imgCounter = imageCounter;
      window.Asc.scope._fnCounter = footnoteCounter;
      window.Asc.scope._crCounter = crossRefCounter;
      window.Asc.scope._crMeta = {};
      window.Asc.scope.scribeExtractMode = "document";
      // 2nd arg = isClose (NOT "read-only", despite the original v3.2 comment):
      // executeCommand(isClose ? "close" : "command"). With true ("close") the
      // command runs but the callback never fires → the host timed out and showed
      // "Impossible de lire le document". Use false ("command") like the selection
      // path so the callback returns the extracted markdown. (Any callCommand
      // truncates the redo stack regardless of this flag — the "preserve redo"
      // rationale was a misreading; here it costs nothing the selection path doesn't
      // already cost.) Image SetName runs read-write like selection extraction;
      // the try/catch guard around it is now just belt-and-suspenders.
      window.Asc.plugin.callCommand(buildScribeExtractionResult, false, false, function(resultJson) {
        var md = "";
        var error = null;
        try {
          var parsed = JSON.parse(resultJson);
          md = (parsed && parsed.md) ? parsed.md : "";
        } catch (eParse) {
          error = "parse-error";
        }
        postToAncestors({
          type: "cozy-bridge:document-extracted",
          reqId: reqId,
          md: md,
          error: error
        });
      });
    } catch (eExtract) {
      postToAncestors({
        type: "cozy-bridge:document-extracted",
        reqId: reqId,
        md: "",
        error: "extract-error"
      });
    }
  });

  // Tell the host we're ready to receive the subscribe state. If the panel was
  // already open at page load, the host's initial selection-subscribe broadcast
  // may have fired before this plugin iframe existed (message lost). Announcing
  // readiness lets the host re-send it so selections sync from the start.
  function announceReady() {
    postToAncestors({ type: "cozy-bridge:plugin-ready" });
  }
  announceReady();

  // ---- Selection detection (via init) ----
  // OO calls init with the selected text/HTML when a selection changes.
  var toolbarButtonAdded = false;
  // Timestamp until which init()'s extraction is suppressed. Set when an
  // undo/redo is invoked (keyboard or toolbar button — see suppressExtraction):
  // the selection change that an undo/redo causes re-triggers init(), and ANY
  // callCommand("command") below — even one that makes no document change —
  // truncates OO's redo stack, breaking redo.
  var suppressExtractionUntil = 0;

  window.Asc.plugin.init = function(data) {
    log("init() — build " + SCRIBE_BUILD);
    // Add toolbar button on first init (API is ready at this point)
    if (!toolbarButtonAdded) {
      addToolbarButton();
      addAssistantTab();
      toolbarButtonAdded = true;
      // Re-announce readiness now that OO has fully initialized the plugin, in
      // case the module-load announce raced ahead of the host's listener.
      announceReady();
    }
    // OO calls init() on EVERY selection change (config initOnSelectionChanged:
    // true). Running the heavy extraction callCommand on each change re-enters the
    // editor mid-interaction and INTERRUPTS OO's mouse-drag tracking — which broke
    // resizing/moving an image by dragging its handles (a drag fires a continuous
    // burst of selection changes). Debounce it so the extraction runs only once
    // the selection has settled; a drag never triggers it mid-operation, and the
    // result is ready well before the user can reach the Scribe trigger.
    if (extractionDebounceTimer) { clearTimeout(extractionDebounceTimer); }
    extractionDebounceTimer = setTimeout(runSelectionExtraction, EXTRACTION_DEBOUNCE_MS);
  };

  // Heavy enriched-markdown extraction from the current selection. Debounced from
  // init() (see above) and called directly by the extractSelection dev-hook.
  // Updates lastSelectedText / lastEnrichedMd / table state and casts
  // SELECTION_CHANGED to the host.
  function runSelectionExtraction() {
    extractionDebounceTimer = null;
    // A mouse button is held in the editor (dragging an image handle to
    // resize/move) — do NOT run the extraction callCommand now; it would abort
    // OO's drag tracking and the image would snap back. mouseup reschedules it.
    if (pointerDown) {
      return;
    }
    // Ignore extraction triggered by our own paste operations.
    if (pasteInProgress) {
      log("extraction skipped — paste in progress");
      return;
    }
    // Skip the heavy extraction right after an undo/redo so its callCommand
    // doesn't wipe the redo stack (which would make redo impossible). The cache
    // stays as-is and self-refreshes on the next real selection change.
    if (Date.now() < suppressExtractionUntil) {
      log("extraction suppressed (undo/redo in progress)");
      return;
    }

    // Run callCommand pre-scan to extract enriched markdown from selection.
    // Pass counters via Asc.scope for stable naming across selections.
    window.Asc.scope.imgCounter = imageCounter;
    window.Asc.scope._fnCounter = footnoteCounter;
    window.Asc.scope._crCounter = crossRefCounter;
    window.Asc.scope._crMeta = {};
    // [TEST HOOK — flag-gated, inert in prod] When the test driver is active, also
    // return tableSnapshots in the extraction JSON (reliable across the callCommand
    // boundary) instead of only via Asc.scope (which doesn't survive callback). In
    // prod this stays off → byte-identical return; snapshots flow via the host relay.
    window.Asc.scope._tReturnSnaps = (window.__scribeTestForce === true);
    window.Asc.scope.scribeExtractMode = "selection";
    window.Asc.plugin.callCommand(buildScribeExtractionResult, false, false, onSelectionExtractResult);
  }

  // v3.2-03 refactor: the selection-extraction callCommand body is a NAMED function
  // so the whole-document path (extract-document handler) reuses the SAME sandbox —
  // all leaf emitters AND buildDocumentExtractionResult live inside it. Reads
  // Asc.scope.scribeExtractMode to pick the document or selection path.
  function buildScribeExtractionResult() {
      // Empty-selection gate (SELECTION mode only): a collapsed cursor (start==end)
      // is NOT a selection. Without this, the walk below returns the WHOLE host
      // paragraph, so moving the cursor (e.g. select P1, then click in P2) wrongly
      // refilled the side-panel chip with that paragraph's text instead of clearing
      // it. A text OR image selection is non-collapsed (an image is a 1-position
      // range — probe-confirmed s≠e), so both still extract. Returns an empty signal
      // → the callback clears the chip. SKIPPED in document mode: the whole-document
      // branch runs later (after the helper/var inits), exactly like the v3.2-03
      // placement — putting it before the inits made buildDocumentExtractionResult
      // run too early and the document callCommand never called back.
      if (Asc.scope.scribeExtractMode !== "document") {
        try {
          var __selRange = Api.GetDocument().GetRangeBySelect();
          if (__selRange && __selRange.GetStartPos() === __selRange.GetEndPos()) {
            return JSON.stringify({ empty: true, text: "", md: "" });
          }
        } catch (e) {}
      }

      // --- All helpers defined inside callCommand (ES5 sandbox) ---

      function escapeMarkdown(text) {
        return text.replace(/([\\*_`\[\]()~#>+\-|{}!])/g, "\\$1");
      }

      // Format a single run element to markdown (inline styles only, no link)
      // Used for isolated runs (headings, list items with a single run).
      // For sequences of runs in a paragraph, use buildMarkdownFromParts().
      function formatRun(runText, tp) {
        if (!runText || runText.length === 0) return "";
        var isBold = tp ? tp.GetBold() : false;
        var isItalic = tp ? tp.GetItalic() : false;
        var isStrike = tp ? tp.GetStrikeout() : false;
        var isUnderline = tp ? tp.GetUnderline() : false;
        var fontFamily = tp ? tp.GetFontFamily() : null;
        var isCode = false;
        if (fontFamily) {
          var ff = fontFamily.toLowerCase();
          if (ff.indexOf("courier") !== -1 || ff.indexOf("consolas") !== -1 || ff.indexOf("mono") !== -1) {
            isCode = true;
          }
        }
        var escaped = escapeMarkdown(runText);
        if (isCode) {
          escaped = "`" + runText + "`";
        }
        if (isBold && isItalic) escaped = "***" + escaped + "***";
        else if (isBold) escaped = "**" + escaped + "**";
        else if (isItalic) escaped = "*" + escaped + "*";
        if (isStrike) escaped = "~~" + escaped + "~~";
        if (isUnderline) escaped = "<u>" + escaped + "</u>";
        return escaped;
      }

      // ── Self-contained segment strategy for markdown emission ──
      //
      // OO documents have overlapping formatting spans (e.g. bold crossing an
      // underline boundary). Markdown requires strict nesting. The previous
      // approach tried to track open/close state across segment boundaries,
      // which led to ambiguous marker sequences like "***" or stray "*".
      //
      // New approach: each segment (= run with a constant format set) is
      // **fully self-contained** — all markers are opened and closed within
      // the segment. No marker ever crosses a segment boundary.
      //
      // Nesting order (outermost → innermost):
      //   <u> → [link](url) → ~~ → ** → * → `
      //
      // Trade-offs accepted:
      //   - Adjacent </u><u> — renders identically in OO (contiguous underline)
      //   - Adjacent [a](url)[b](url) — same-URL links merge visually in OO
      //   - Slightly more verbose markdown — but unambiguous and LLM-friendly
      //
      // CommonMark whitespace rule: opening ** / * must not be followed by
      // whitespace. We move leading/trailing whitespace outside the markers
      // but keep it inside <u> and [...] so spacing is preserved.
      function buildMarkdownFromParts(parts) {
        var result = "";

        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];

          // Raw parts (image markers) — emit as-is
          if (part.raw) {
            result += part.text;
            continue;
          }

          if (!part.text || part.text.length === 0) continue;

          var text = part.text;
          var wantBold = !!part.bold;
          var wantItalic = !!part.italic;
          var wantStrike = !!part.strikethrough;
          var wantCode = !!part.code;
          var wantUnderline = !!part.underline;
          var link = part.link || null;
          var hasEmphasis = wantBold || wantItalic || wantStrike || wantCode;

          // ── Whitespace extraction ──
          // Move leading/trailing whitespace outside emphasis markers (** * ~~ `)
          // but keep it inside <u> and [link] so underline/link span is preserved.
          var leadingWS = "";
          var trailingWS = "";
          if (hasEmphasis && !wantCode) {
            var lm = text.match(/^(\s+)/);
            if (lm && lm[1].length < text.length) {
              leadingWS = lm[1];
              text = text.substring(leadingWS.length);
            }
            var tm = text.match(/(\s+)$/);
            if (tm && tm[1].length < text.length) {
              trailingWS = tm[1];
              text = text.substring(0, text.length - trailingWS.length);
            }
          }

          // If text is all whitespace, emit directly (no markers needed)
          if (text.length === 0) {
            result += part.text;
            continue;
          }

          // ── Build segment string ──
          var seg = "";

          // Open outer markers
          if (wantUnderline) seg += "<u>";
          if (link) seg += "[";

          // Leading whitespace (inside <u>/link, outside emphasis)
          seg += leadingWS;

          // Open emphasis markers (outermost → innermost)
          if (wantStrike) seg += "~~";
          if (wantBold) seg += "**";
          if (wantItalic) seg += "*";
          if (wantCode) seg += "`";

          // Emit text content
          if (wantCode || link) {
            seg += link ? escapeMarkdown(text) : text;
          } else {
            seg += escapeMarkdown(text);
          }

          // Close emphasis markers (innermost → outermost)
          if (wantCode) seg += "`";
          if (wantItalic) seg += "*";
          if (wantBold) seg += "**";
          if (wantStrike) seg += "~~";

          // Trailing whitespace (inside <u>/link, outside emphasis)
          seg += trailingWS;

          // Close outer markers
          if (link) seg += "](" + link + ")";
          if (wantUnderline) seg += "</u>";

          result += seg;
        }

        return result;
      }

      function paragraphToMarkdown(para, clipStartChars, clipEndChars) {
        clipStartChars = clipStartChars || 0;
        clipEndChars = clipEndChars || 0;
        // Build an array of annotated parts for buildMarkdownFromParts()
        var annotatedParts = [];

        // All drawings anchored in this paragraph — INLINE (inside a run, with a
        // character position) AND FLOATING (anchored to the paragraph, outside the
        // run text stream). GetInlineDrawings() below only sees inline ones; we
        // reconcile against this superset at the end so floating images are never
        // dropped (the cause of "image sometimes missing from the extracted md").
        // NOTE: GetInlineDrawings() is an sdkjs ApiRun method added by OUR patch
        // (ONLYOFFICE/sdkjs PR #4868 — exposes a run's inline drawings + their char
        // position so the "{{IMG:scribe-img-N}}" marker can be placed in the text
        // stream); stock OO 9.4 lacks it. It ships baked into the deployed sdk-all.js
        // (see project_oo_sdk_pr / plugins/onlyoffice-scribe/oo-api-proposal.md). The
        // `el.GetInlineDrawings ? … : []` guards below degrade gracefully if unpatched.
        var paraDrawings = para.GetAllDrawingObjects() || [];
        var hasScribeDrawings = paraDrawings.length > 0;
        var emittedImg = {};     // scribe-img names already emitted inline (dedup vs floating pass)
        // Stable scribe-img-* name for a drawing: reuse an existing scribe name,
        // else assign the next counter value. SetName persists on the read-write
        // extraction paths (selection AND document); guarded so it is harmless if
        // it ever no-ops. getDrawingMarker() already named these in document order
        // before paragraphToMarkdown runs, so this normally just reads them back.
        // ---------------------------------------------------------------------
        // IMAGE ROUND-TRIP — how a picture survives "extract → LLM → reinject".
        //
        // An image has no portable content in markdown, so we give each picture a
        // STABLE NAME and pass only that name through the text:
        //
        //   1. EXTRACTION (here): every image in the selection is named
        //      "scribe-img-<N>" via ApiDrawing.SetName() — a name that PERSISTS on
        //      the drawing inside the live document. The markdown carries the name
        //      as a marker: inline "{{IMG:scribe-img-N}}" (positioned in the text
        //      via the GetInlineDrawings patch) or block "![IMG:scribe-img-N]".
        //   2. The marker travels verbatim through the LLM and stays in the chat
        //      message — it is just text.
        //   3. REINJECTION (buildAndInject): the fragment's markers are resolved by
        //      scanning the live document for the drawing that currently bears that
        //      name (drawingIndex, name -> ApiDrawing), Copy()-ing its bitmap, and
        //      PasteHtml-ing it where the marker sits.
        //
        // The name is therefore a REFERENCE to a live drawing, not the picture
        // itself. Consequences:
        //   • A chat fragment produced long ago still inserts correctly AS LONG AS
        //     the referenced drawing still exists in the document with that name.
        //   • If that image was deleted, the marker resolves to nothing and the
        //     image is silently dropped (the surrounding text still injects).
        //
        // STABILITY — why the name does not drift. The historical counter reset to 0
        // on each extraction, so repeated edits stamped many images with the SAME
        // name (scribe-img-0) and reinjection then resolved markers to the wrong
        // image. We now (a) seed the counter PAST every existing scribe-img-N so a
        // NEW name can never collide, and (b) reuse an image's existing name ONLY
        // when it is UNIQUE in the document (count === 1). A unique name is thus
        // preserved across re-extractions → the id is stable; a duplicated/stale
        // name is re-stamped fresh so the picture becomes addressable again.
        // ---------------------------------------------------------------------
        function imgNameOf(drawing) {
          var nm = (drawing && drawing.GetName) ? drawing.GetName() : "";
          if (nm && nm.indexOf("scribe-img-") === 0) {
            // CONTEXT (whole-document) extraction: reuse any scribe name and never
            // SetName — its markers are never reinjected, so it must not mutate the
            // document. SELECTION (round-trip): reuse only a name that is UNIQUE in
            // the doc (stable id); a duplicated name is a stale collision → re-stamp.
            if (Asc.scope.scribeExtractMode === "document") return nm;
            if (((Asc.scope._imgNameCount || {})[nm] || 0) === 1) return nm;
          }
          nm = "scribe-img-" + Asc.scope.imgCounter;
          Asc.scope.imgCounter = Asc.scope.imgCounter + 1;
          if (Asc.scope.scribeExtractMode !== "document") {
            // Rename WITHOUT a history point: the extraction's SetName otherwise
            // lands in its own undo point right before injection (→ 2 undos to revert
            // an image Insert). History.TurnOff/On (nestable counter gating
            // CanAddChanges) is OO's own no-history pattern (Document.js). The name
            // still applies to the drawing and persists at save; only undo is skipped.
            try {
              if (drawing && drawing.SetName) {
                var _hi = (typeof AscCommon !== "undefined") ? AscCommon.History : null;
                if (_hi && _hi.TurnOff) _hi.TurnOff();
                try { drawing.SetName(nm); } finally { if (_hi && _hi.TurnOn) _hi.TurnOn(); }
              }
            } catch (e) {}
            // The fresh name is now unique → reuse it on later visits to the same
            // drawing within THIS extraction (run loop, then floating-image pass).
            if (Asc.scope._imgNameCount) Asc.scope._imgNameCount[nm] = 1;
          }
          return nm;
        }

        // Helper to extract formatting flags from a text properties object
        function getRunFlags(tp) {
          var isBold = tp ? tp.GetBold() : false;
          var isItalic = tp ? tp.GetItalic() : false;
          var isStrike = tp ? tp.GetStrikeout() : false;
          var isUnderline = tp ? tp.GetUnderline() : false;
          var fontFamily = tp ? tp.GetFontFamily() : null;
          var isCode = false;
          if (fontFamily) {
            var ff = fontFamily.toLowerCase();
            if (ff.indexOf("courier") !== -1 || ff.indexOf("consolas") !== -1 || ff.indexOf("mono") !== -1) {
              isCode = true;
            }
          }
          return { bold: !!isBold, italic: !!isItalic, strikethrough: !!isStrike, underline: !!isUnderline, code: isCode };
        }

        var count = para.GetElementsCount();
        for (var i = 0; i < count; i++) {
          var el = para.GetElement(i);
          var classType = el.GetClassType ? el.GetClassType() : "";

          if (classType === "hyperlink") {
            var hUrl = el.GetLinkedText ? el.GetLinkedText() : "";
            // Cross-reference detection: hyperlinks with empty GetLinkedText are cross-refs
            if (!hUrl || hUrl.length === 0) {
              var crDisplayed = el.GetDisplayedText ? el.GetDisplayedText() : "";
              var crScreenTip = el.GetScreenTipText ? el.GetScreenTipText() : "";
              // Trim trailing whitespace/newlines from screenTip (OO sometimes appends \n)
              crScreenTip = crScreenTip.replace(/[\s\n\r]+$/, "");
              if (crDisplayed) {
                var crName = "scribe-ref-" + Asc.scope._crCounter;
                Asc.scope._crCounter = (Asc.scope._crCounter || 0) + 1;
                // Determine cross-ref type from screenTip
                var crType = "unknown";
                if (crScreenTip.indexOf("#_") === 0) {
                  crType = "heading";
                } else if (crScreenTip.length > 0) {
                  crType = "bookmark";
                }
                // Capture ToJSON for full cross-ref recreation (includes anchor field)
                var crJson = null;
                try { crJson = el.ToJSON(); } catch (e) {}
                // Store metadata for injection
                if (!Asc.scope._crMeta) Asc.scope._crMeta = {};
                Asc.scope._crMeta[crName] = {
                  type: crType, screenTip: crScreenTip, displayedText: crDisplayed,
                  json: crJson
                };
                annotatedParts.push({ text: "{{REF:" + crName + ":" + crDisplayed + "}}", raw: true });
              }
              continue;
            }
            // Regular hyperlink — collect display text and formatting from child runs
            var hText = "";
            var hFlags = { bold: false, italic: false, strikethrough: false, code: false };
            var hCount = el.GetElementsCount ? el.GetElementsCount() : 0;
            for (var hi = 0; hi < hCount; hi++) {
              var hChild = el.GetElement(hi);
              var hChildText = hChild.GetText ? hChild.GetText() : "";
              if (hChildText) hText += hChildText;
              // Use formatting of first non-empty child run
              if (hChildText && !hFlags._set) {
                var hTp = hChild.GetTextPr ? hChild.GetTextPr() : null;
                if (hTp) {
                  hFlags = getRunFlags(hTp);
                  hFlags._set = true;
                }
              }
            }
            if (hUrl && hText) {
              annotatedParts.push({ text: hText, link: hUrl, bold: hFlags.bold, italic: hFlags.italic, strikethrough: hFlags.strikethrough, underline: hFlags.underline, code: hFlags.code });
            } else if (hText) {
              annotatedParts.push({ text: hText, bold: hFlags.bold, italic: hFlags.italic, strikethrough: hFlags.strikethrough, underline: hFlags.underline, code: hFlags.code });
            }
          } else if (classType === "run") {
            var runText = el.GetText();
            if (!runText || runText.length === 0) {
              // Check for footnote reference mark (style "footnote reference", empty text)
              try {
                var fnStyle = el.GetStyle ? el.GetStyle() : null;
                if (fnStyle && typeof fnStyle === "object" && fnStyle.GetName) {
                  var fnStyleName = fnStyle.GetName();
                  if (fnStyleName === "footnote reference") {
                    var fnName = "scribe-fn-" + (Asc.scope._fnCounter || 0);
                    Asc.scope._fnCounter = (Asc.scope._fnCounter || 0) + 1;
                    annotatedParts.push({ text: "[^" + fnName + "]", raw: true });
                    continue;
                  }
                }
              } catch (eFn) { /* style check failed — not a footnote ref */ }
              // Inline drawing(s) inside an otherwise-empty run.
              if (hasScribeDrawings) {
                var emptyRunDrawings = el.GetInlineDrawings ? el.GetInlineDrawings() : [];
                for (var ed = 0; ed < emptyRunDrawings.length; ed++) {
                  var edName = imgNameOf(emptyRunDrawings[ed].drawing);
                  annotatedParts.push({ text: "{{IMG:" + edName + "}}", raw: true });
                  emittedImg[edName] = true;
                }
              }
              continue;
            }

            var flags = getRunFlags(el.GetTextPr ? el.GetTextPr() : null);

            // Run has text — check for inline drawings interleaved with text
            if (hasScribeDrawings) {
              var inlineDrawings = el.GetInlineDrawings ? el.GetInlineDrawings() : [];
              if (inlineDrawings.length > 0) {
                var lastPos = 0;
                for (var id = 0; id < inlineDrawings.length; id++) {
                  var dPos = inlineDrawings[id].position;
                  var dName = imgNameOf(inlineDrawings[id].drawing);
                  if (dPos > lastPos) {
                    annotatedParts.push({ text: runText.substring(lastPos, dPos), bold: flags.bold, italic: flags.italic, strikethrough: flags.strikethrough, underline: flags.underline, code: flags.code });
                  }
                  annotatedParts.push({ text: "{{IMG:" + dName + "}}", raw: true });
                  emittedImg[dName] = true;
                  lastPos = dPos;
                }
                if (lastPos < runText.length) {
                  annotatedParts.push({ text: runText.substring(lastPos), bold: flags.bold, italic: flags.italic, strikethrough: flags.strikethrough, underline: flags.underline, code: flags.code });
                }
                continue;
              }
            }

            // Normal text run (no drawings)
            annotatedParts.push({ text: runText, bold: flags.bold, italic: flags.italic, strikethrough: flags.strikethrough, underline: flags.underline, code: flags.code });
          } else {
            var fallbackText = el.GetText ? el.GetText() : "";
            if (fallbackText) {
              annotatedParts.push({ text: escapeMarkdown(fallbackText), raw: true });
            }
          }
        }

        // Clip annotated parts to selection bounds if needed
        if (clipStartChars > 0 || clipEndChars > 0) {
          var totalLen = 0;
          for (var cl = 0; cl < annotatedParts.length; cl++) {
            totalLen += (annotatedParts[cl].text || "").length;
          }
          var keepFrom = clipStartChars;
          var keepTo = totalLen - clipEndChars;
          if (keepFrom > 0 || keepTo < totalLen) {
            var clipped = [];
            var cPos = 0;
            for (var ci = 0; ci < annotatedParts.length; ci++) {
              var cText = annotatedParts[ci].text || "";
              var cPartStart = cPos;
              var cPartEnd = cPos + cText.length;
              cPos = cPartEnd;
              if (cPartEnd <= keepFrom) continue;
              if (cPartStart >= keepTo) continue;
              var cFrom = keepFrom > cPartStart ? keepFrom - cPartStart : 0;
              var cTo = keepTo < cPartEnd ? keepTo - cPartStart : cText.length;
              var cClipped = cText.substring(cFrom, cTo);
              if (cClipped.length > 0) {
                var cPart = {};
                for (var ck in annotatedParts[ci]) {
                  if (annotatedParts[ci].hasOwnProperty(ck)) cPart[ck] = annotatedParts[ci][ck];
                }
                cPart.text = cClipped;
                clipped.push(cPart);
              }
            }
            annotatedParts = clipped;
          }
        }

        // FLOATING / ANCHORED images: present in GetAllDrawingObjects() but never
        // returned by GetInlineDrawings() (they live outside the run text stream),
        // so the run loop above never emitted them. Emit a marker for every
        // paragraph drawing not already emitted inline — wrap type (inline vs
        // floating) and which paragraph the image is anchored to no longer decide
        // whether it survives extraction. Appended after clipping so a floating
        // image anchored to a partially-selected paragraph is still kept.
        for (var fd = 0; fd < paraDrawings.length; fd++) {
          var fdName = imgNameOf(paraDrawings[fd]);
          if (!emittedImg[fdName]) {
            annotatedParts.push({ text: "{{IMG:" + fdName + "}}", raw: true });
            emittedImg[fdName] = true;
          }
        }

        return buildMarkdownFromParts(annotatedParts);
      }

      // Detect heading level from paragraph style name
      function getHeadingLevel(para) {
        var style = para.GetStyle();
        if (!style) return 0;
        var name = style.GetName();
        if (!name) return 0;
        // Match "Heading N" or "Titre N" (French OO)
        var match = name.match(/^(?:Heading|Titre)\s+(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      }

      // Read a numbering level's format (bullet vs ordered) via the PUBLIC API.
      // `ApiNumberingLevel` (what para.GetNumbering() returns) has NO format getter,
      // and the old `GetNumFmt()` does not exist in the SDK at all → it always
      // returned null → every list was classified "bullet" (bug: numbered lists
      // extracted as bullets). The only stable public path is ApiNumbering.ToJSON(),
      // which serializes each level's `numFmt.val` ("decimal"/"lowerLetter"/…/"bullet").
      // We DON'T reach into the mangled internal (`np.fj`/`np.tc`) — those names are
      // build-specific. JSON shape (probe-confirmed): { abstractNum:{<id>:{lvl:[{numFmt:
      // {val}},…]}}, num:{<numId>:{abstractNumId:<id>}} }.
      function numFormatAtLevel(numPr, lvl) {
        try {
          var apiNum = numPr.GetNumbering ? numPr.GetNumbering() : null;
          if (!apiNum || !apiNum.ToJSON) return null;
          var def = JSON.parse(apiNum.ToJSON());
          var absId = null;
          for (var nk in def.num) { absId = def.num[nk].abstractNumId; break; }
          if (!absId || !def.abstractNum || !def.abstractNum[absId]) return null;
          var lvls = def.abstractNum[absId].lvl;
          if (!lvls || !lvls[lvl]) return null;
          var nf = lvls[lvl].numFmt;
          var val = nf && (typeof nf === "object" ? nf.val : nf);
          if (!val || val === "bullet" || val === "none") return "bullet";
          return "ordered";
        } catch (e) { return null; }
      }

      // Detect list type AND nesting level from numbering (preferred) or style name.
      // level = the TRUE numbering level (ilvl) when available — reliable for nested
      // multi-level lists; null falls back to the indent heuristic at the call site.
      function isListParagraph(para) {
        var numPr = para.GetNumbering();
        if (numPr) {
          var lvl = numPr.GetLevelIndex ? numPr.GetLevelIndex() : 0;
          if (typeof lvl !== "number" || lvl < 0) lvl = 0;
          var fmt = numFormatAtLevel(numPr, lvl);
          // fmt null (ToJSON unreadable) → fall back to bullet (old safe default)
          return { type: fmt === "ordered" ? "ordered" : "bullet", level: lvl };
        }
        // Fallback: check style name (no reliable level → null = use indent)
        var style = para.GetStyle();
        if (style) {
          var sn = style.GetName();
          if (sn && /list\s*number/i.test(sn)) return { type: "ordered", level: null };
          if (sn && /list\s*bullet/i.test(sn)) return { type: "bullet", level: null };
        }
        return null;
      }

      // --- Image detection helper (MARK-01) ---
      function getDrawingMarker(para) {
        var drawings = para.GetAllDrawingObjects();
        if (!drawings || drawings.length === 0) return null;
        var markers = [];
        var hasUnnamed = false;
        for (var d = 0; d < drawings.length; d++) {
          var drawing = drawings[d];
          var name = drawing.GetName();
          var _reuse = false;
          // Mirror of imgNameOf (see its block comment for the full round-trip):
          // reuse any scribe name on the CONTEXT path, but on the SELECTION path
          // reuse ONLY a name that is UNIQUE in the document (stable id); a
          // duplicated name is a stale collision → re-stamp it fresh.
          if (name && name.indexOf("scribe-img-") === 0) {
            if (Asc.scope.scribeExtractMode === "document") _reuse = true;
            else if (((Asc.scope._imgNameCount || {})[name] || 0) === 1) _reuse = true;
          }
          if (!_reuse) {
            name = "scribe-img-" + Asc.scope.imgCounter;
            Asc.scope.imgCounter = Asc.scope.imgCounter + 1;
            if (Asc.scope.scribeExtractMode !== "document") {
              // Rename without a history point (see the inline-image SetName above).
              try {
                var _hi2 = (typeof AscCommon !== "undefined") ? AscCommon.History : null;
                if (_hi2 && _hi2.TurnOff) _hi2.TurnOff();
                try { drawing.SetName(name); } finally { if (_hi2 && _hi2.TurnOn) _hi2.TurnOn(); }
              } catch (eSetName) {}
              if (Asc.scope._imgNameCount) Asc.scope._imgNameCount[name] = 1;
            }
            hasUnnamed = true;
          }
          markers.push({ name: name });
        }
        // Determine block vs inline: if paragraph has ONLY drawings and no text
        var paraText = para.GetText();
        var trimmed = paraText.replace(/^\s+|\s+$/g, "");
        if (trimmed.length === 0 && markers.length > 0) {
          // Block images — one per line
          var result = [];
          for (var m = 0; m < markers.length; m++) {
            result.push("![IMG:" + markers[m].name + "](placeholder)");
          }
          return { md: result.join("\n"), isBlock: true, hasUnnamed: hasUnnamed };
        } else {
          // Inline images — embed in text
          var inlineParts = [];
          for (var m2 = 0; m2 < markers.length; m2++) {
            inlineParts.push("{{IMG:" + markers[m2].name + "}}");
          }
          return { md: inlineParts.join(""), isBlock: false, hasUnnamed: hasUnnamed };
        }
      }

      // --- Partial table selection analysis (TBL-01) ---
      // Returns: { full, selectedCells, ambiguous, reason, intraCell }
      // Uses paragraph-to-cell mapping via GetParentTableCell() instead of
      // position-based overlap, because positions are sequential in the document
      // and can't distinguish column selections from row selections.
      function analyzeTableSelection(table, selStart, selEnd, paragraphs) {
        var tblRange = table.GetRange();
        if (!tblRange) return { full: false, selectedCells: [], ambiguous: true, reason: "no_range" };
        var tblStart = tblRange.GetStartPos();
        var tblEnd = tblRange.GetEndPos();
        var rowCount = table.GetRowsCount();

        // Count total non-empty cells in the table
        var totalNonEmptyCells = 0;
        for (var r = 0; r < rowCount; r++) {
          var row = table.GetRow(r);
          for (var c = 0; c < row.GetCellsCount(); c++) {
            var cell = table.GetCell(r, c);
            if (!cell) continue;
            var content = cell.GetContent();
            if (content && content.GetElementsCount() > 0) totalNonEmptyCells++;
          }
        }

        // Build set of cells that have paragraphs in the selection
        // using GetParentTableCell() — this is the ground truth of what's selected
        var hitCells = {}; // "r,c" → {r, c}
        var hitCount = 0;
        var inTableParaCount = 0; // # selected paragraphs that belong to THIS table
        for (var pi = 0; pi < paragraphs.length; pi++) {
          var pRange = paragraphs[pi].GetRange ? paragraphs[pi].GetRange() : null;
          if (!pRange) continue;
          var pPos = pRange.GetStartPos();
          // Only consider paragraphs within this table's range
          if (pPos < tblStart || pPos > tblEnd) continue;
          var parentCell = paragraphs[pi].GetParentTableCell ? paragraphs[pi].GetParentTableCell() : null;
          if (!parentCell) continue;
          var cellR = parentCell.GetRowIndex ? parentCell.GetRowIndex() : -1;
          var cellC = parentCell.GetIndex ? parentCell.GetIndex() : -1;
          if (cellR < 0 || cellC < 0) continue;
          // Only count cells that ACTUALLY belong to the table being analyzed.
          // Header/footer tables collide with body positions (all start at pos 0),
          // so pPos-overlap can drag in paragraphs whose REAL parent is another table
          // — importing its cell coords (e.g. row 2) into a 2-row header table, then
          // GetCell(2,c) throws "Row index out of bounds". Verify parent-table identity
          // (GetParentTable), with a bounds check fallback when it is unavailable.
          var pTable = parentCell.GetParentTable ? parentCell.GetParentTable() : null;
          if (pTable) {
            var sameT = (pTable === table);
            if (!sameT) {
              try {
                var _pr = pTable.GetRange();
                sameT = !!_pr && _pr.GetStartPos() === tblStart && _pr.GetEndPos() === tblEnd && pTable.GetRowsCount() === rowCount;
              } catch (eId) { sameT = false; }
            }
            if (!sameT) continue;
          } else if (cellR >= rowCount) {
            continue; // coord cannot exist in this table → belongs to another table
          }
          inTableParaCount++; // this selected paragraph belongs to THIS table
          var key = cellR + "," + cellC;
          if (!hitCells[key]) {
            hitCells[key] = { r: cellR, c: cellC };
            hitCount++;
          }
        }

        // No cell of this table is selected → table not involved.
        // (GetParentTableCell null for all selected paragraphs.) This happens when a
        // BODY selection numerically overlaps a HEADER/FOOTER table's position range —
        // those live in a separate 0-based coordinate space that collides with body
        // positions (GetAllTables returns them, all starting at pos 0). Such a table is
        // NOT part of the selection → fall through to normal text extraction; do NOT
        // flag ambiguous. A genuine partial/ambiguous selection always has hitCount >= 1.
        if (hitCount === 0) {
          return { full: false, selectedCells: [], ambiguous: false, reason: "not_involved", notInvolved: true };
        }

        // Intra-cell — ONLY when the WHOLE selection sits inside this one cell (nothing
        // else selected). If the selection also holds content OUTSIDE this table (a
        // paragraph before/after, or another table's cells), it is a MIXED
        // paragraph+table selection (T4/T5): the touched cell must be emitted as a
        // partial table ([TABLE]/[CELL]) rather than flattened to plain text. So a
        // single hit cell with external content falls through to the partial branch.
        if (hitCount === 1 && inTableParaCount >= paragraphs.length) {
          return { full: false, selectedCells: [], ambiguous: false, reason: "intra_cell", intraCell: true };
        }

        // Full table: all non-empty cells have paragraphs in the selection.
        // For Replace: in-place modification works regardless (full or partial).
        // For Insert: clone+InsertContent needs the table structure in the selection,
        // but we return full:true here and let the Insert path handle it.
        if (hitCount >= totalNonEmptyCells) {
          return { full: true, selectedCells: [], ambiguous: false, reason: null };
        }

        // Partial table: some cells selected
        var selectedCells = [];
        for (var hk in hitCells) {
          if (hitCells.hasOwnProperty(hk)) {
            selectedCells.push(hitCells[hk]);
          }
        }

        // Include empty cells whose row has at least one selected cell
        var selectedRowSet = {};
        for (var si = 0; si < selectedCells.length; si++) {
          selectedRowSet[selectedCells[si].r] = true;
        }
        for (var r2 = 0; r2 < rowCount; r2++) {
          if (!selectedRowSet[r2]) continue;
          var row2 = table.GetRow(r2);
          var cellCount2 = row2.GetCellsCount();
          for (var c2 = 0; c2 < cellCount2; c2++) {
            var key2 = r2 + "," + c2;
            if (hitCells[key2]) continue; // already counted
            var emptyCell = table.GetCell(r2, c2);
            if (emptyCell) {
              var ec = emptyCell.GetContent();
              if (!ec || ec.GetElementsCount() === 0) {
                selectedCells.push({ r: r2, c: c2 });
              }
            }
          }
        }

        // Sort selectedCells by row then column for consistent ordering
        selectedCells.sort(function(a, b) { return a.r !== b.r ? a.r - b.r : a.c - b.c; });
        return { full: false, selectedCells: selectedCells, ambiguous: false, reason: null };
      }

      // --- Partial table cell extraction (TBL-01) ---
      // Extract the markdown content of a single cell (all paragraphs joined by \n\n).
      function extractCellContent(cell) {
        var content = cell.GetContent();
        var cellText = "";
        var elemCount = content ? content.GetElementsCount() : 0;
        for (var e = 0; e < elemCount; e++) {
          var elem = content.GetElement(e);
          if (elem.GetClassType && elem.GetClassType() === "paragraph") {
            // Use getDrawingMarker to assign scribe-img-* names to unnamed drawings
            // and detect block images (paragraph with only drawings, no text)
            var imgMarker = getDrawingMarker(elem);
            var paraMd;
            if (imgMarker && imgMarker.isBlock) {
              paraMd = imgMarker.md;
            } else {
              paraMd = paragraphToMarkdown(elem);
            }
            if (cellText.length > 0) cellText = cellText + "\n\n";
            cellText = cellText + paraMd;
          }
        }
        return cellText;
      }

      function extractPartialTableCells(table, selectedCells) {
        var cellMd = [];
        for (var i = 0; i < selectedCells.length; i++) {
          var sc = selectedCells[i];
          // Defensive bounds check: GetCell(r,c) THROWS (not returns null) when out
          // of range, which would crash the whole extraction. Skip impossible coords.
          var _rc = table.GetRowsCount ? table.GetRowsCount() : 0;
          if (sc.r < 0 || sc.r >= _rc) continue;
          var _row = table.GetRow ? table.GetRow(sc.r) : null;
          var _cc = (_row && _row.GetCellsCount) ? _row.GetCellsCount() : 0;
          if (sc.c < 0 || sc.c >= _cc) continue;
          var cell = table.GetCell(sc.r, sc.c);
          if (!cell) continue;
          cellMd.push("[CELL:" + sc.r + "," + sc.c + "]" + extractCellContent(cell) + "[/CELL]");
        }
        return cellMd.join("\n");
      }

      // --- Table cell extraction helper (MARK-02) ---
      // Extracts all cells — delegates to extractPartialTableCells with full cell list.
      function extractTableCells(table) {
        var allCells = [];
        var rowCount = table.GetRowsCount();
        for (var r = 0; r < rowCount; r++) {
          var row = table.GetRow(r);
          for (var c = 0; c < row.GetCellsCount(); c++) {
            allCells.push({ r: r, c: c });
          }
        }
        return extractPartialTableCells(table, allCells);
      }

      // Whole-document extraction (v3.2-03, D-01). Defined inside the sandbox so it
      // reuses the leaf emitters above (paragraphToMarkdown, extractTableCells,
      // getHeadingLevel, isListParagraph, getDrawingMarker) for full fidelity.
      //
      // Iterates top-level blocks in document order via GetElementsCount()/
      // GetElement(i)/GetClassType(). It deliberately does NOT use
      // doc.GetAllParagraphs(), which silently omits table-cell paragraphs and would
      // drop all table content. Tables surface as first-class blocks via
      // extractTableCells.
      //
      // NO plugin-side size guard (D-02 "send everything by default"): the WHOLE
      // document is always returned. The selection path's silent >100-paragraph
      // md:"" fallback is intentionally NOT inherited here. All size bounding and
      // never-silent truncation signalling happen host-side (plan 02 applyBudget).
      function buildDocumentExtractionResult(doc) {
        var mdParts = [];
        var orderedCounters = {};
        var tableIndex = 0;
        var blockCount = doc.GetElementsCount();

        // Pre-scan list paragraphs (document order) to build the indent -> depth map,
        // mirroring the selection path's nesting-level mapping.
        var indentSet = {};
        for (var pi = 0; pi < blockCount; pi++) {
          var pel = doc.GetElement(pi);
          var pct = (pel && pel.GetClassType) ? pel.GetClassType() : "";
          if (pct === "paragraph" && isListParagraph(pel)) {
            var pind = pel.GetIndLeft ? pel.GetIndLeft() : 0;
            if (pind > 0) indentSet[pind] = true;
          }
        }
        var uniqueIndents = [];
        for (var ikey in indentSet) {
          if (indentSet.hasOwnProperty(ikey)) uniqueIndents.push(Number(ikey));
        }
        uniqueIndents.sort(function(a, b) { return a - b; });
        function docIndentToLevel(indLeft) {
          if (!indLeft || indLeft <= 0) return 0;
          for (var idx = 0; idx < uniqueIndents.length; idx++) {
            if (uniqueIndents[idx] === indLeft) return idx;
          }
          return 0;
        }

        for (var i = 0; i < blockCount; i++) {
          var el = doc.GetElement(i);
          var ct = (el && el.GetClassType) ? el.GetClassType() : "";

          if (ct === "table") {
            var tableCellsMd = extractTableCells(el);
            mdParts.push({ md: "[TABLE:" + tableIndex + "]\n" + tableCellsMd + "\n[/TABLE]", isList: false });
            tableIndex = tableIndex + 1;
            orderedCounters = {};
            continue;
          }
          if (ct !== "paragraph") continue;

          // Block-level image (paragraph holding only drawings).
          var imgMarker = getDrawingMarker(el);
          if (imgMarker && imgMarker.isBlock) {
            mdParts.push({ md: imgMarker.md, isList: false });
            orderedCounters = {};
            continue;
          }

          var headingLvl = getHeadingLevel(el);
          var listType = isListParagraph(el);
          var listInfo = null;
          if (listType) {
            var paraIndent = el.GetIndLeft ? el.GetIndLeft() : 0;
            listInfo = { type: listType.type, level: docIndentToLevel(paraIndent) };
          }

          // No selection clipping for the whole-document path (clip = 0, 0).
          var paraMarkdown = paragraphToMarkdown(el, 0, 0);

          if (headingLvl > 0 && headingLvl <= 6) {
            var hashes = "";
            for (var h = 0; h < headingLvl; h++) hashes = hashes + "#";
            paraMarkdown = hashes + " " + paraMarkdown;
          }

          if (listInfo) {
            var indent = "";
            for (var lv = 0; lv < listInfo.level; lv++) indent = indent + "  ";
            if (listInfo.type === "bullet") {
              paraMarkdown = indent + "- " + paraMarkdown;
            } else {
              if (!orderedCounters[listInfo.level]) orderedCounters[listInfo.level] = 0;
              orderedCounters[listInfo.level] = orderedCounters[listInfo.level] + 1;
              paraMarkdown = indent + orderedCounters[listInfo.level] + ". " + paraMarkdown;
            }
            for (var rl = listInfo.level + 1; rl < 10; rl++) {
              orderedCounters[rl] = 0;
            }
          } else {
            orderedCounters = {};
          }

          mdParts.push({ md: paraMarkdown, isList: !!listInfo });
        }

        // Join: single \n between consecutive list items, \n\n between other blocks
        // (identical spacing rule to the selection path).
        var mdLines = [];
        for (var j = 0; j < mdParts.length; j++) {
          if (j > 0) {
            var prevIsList = mdParts[j - 1].isList;
            var currIsList = mdParts[j].isList;
            mdLines.push((prevIsList && currIsList) ? "\n" : "\n\n");
          }
          mdLines.push(mdParts[j].md);
        }

        return JSON.stringify({ md: mdLines.join(""), blockCount: mdParts.length });
      }

      // --- Main extraction logic ---
      var doc = Api.GetDocument();

      // --- Image identity seed (fixes wrong-image reinjection) ---
      // The image counter historically reset to 0 each extraction, so repeated
      // edits stamped MANY images with the SAME name (scribe-img-0). At reinjection
      // the name->drawing index then resolved a marker to the WRONG image (the last
      // one bearing that name), and two selected images could both be scribe-img-0.
      // Seed the counter PAST the highest scribe-img-N already in the document, and
      // record that base. On the SELECTION (round-trip) path imgNameOf /
      // getDrawingMarker re-stamp any image whose number is below the base, so the
      // images that reach the LLM fragment carry unique, resolvable names. The
      // CONTEXT (document) path keeps existing names (base 0) and never SetName's —
      // it isn't reinjected, so it must not mutate the document.
      (function seedImageCounter() {
        if (Asc.scope.scribeExtractMode === "document") { Asc.scope._imgNameCount = null; return; }
        var counts = {};   // scribe-img-N -> how many drawings currently bear it
        var mx = -1;
        function scanNames(draws) {
          if (!draws) return;
          for (var k = 0; k < draws.length; k++) {
            var nm = (draws[k] && draws[k].GetName) ? draws[k].GetName() : "";
            if (nm && nm.indexOf("scribe-img-") === 0) {
              counts[nm] = (counts[nm] || 0) + 1;
              var v = parseInt(nm.substring(11), 10);
              if (!isNaN(v) && v > mx) mx = v;
            }
          }
        }
        try {
          var ps = doc.GetAllParagraphs();
          for (var i = 0; i < ps.length; i++) scanNames(ps[i].GetAllDrawingObjects());
          var ts = doc.GetAllTables();
          for (var t = 0; t < ts.length; t++) {
            var rows = ts[t].GetRowsCount();
            for (var r = 0; r < rows; r++) {
              var row = ts[t].GetRow(r);
              var cc = row ? row.GetCellsCount() : 0;
              for (var c = 0; c < cc; c++) {
                var cell = ts[t].GetCell(r, c);
                var content = cell ? cell.GetContent() : null;
                var ec = content ? content.GetElementsCount() : 0;
                for (var e = 0; e < ec; e++) {
                  var elx = content.GetElement(e);
                  if (elx && elx.GetAllDrawingObjects) scanNames(elx.GetAllDrawingObjects());
                }
              }
            }
          }
        } catch (eSeed) {}
        Asc.scope._imgNameCount = counts;   // imgNameOf reuses a name only if its count === 1 (unique → stable id)
        // New names start past every existing scribe-img-N so they can never collide.
        if (!Asc.scope.imgCounter || Asc.scope.imgCounter < mx + 1) Asc.scope.imgCounter = mx + 1;
      })();

      // v3.2-03 mode branch: 'document' extracts the WHOLE document HERE — after all
      // helper declarations and var inits above are in scope (the verified v3.2
      // placement). Any other value ('selection'/undefined) runs the selection logic.
      if (Asc.scope.scribeExtractMode === "document") {
        return buildDocumentExtractionResult(doc);
      }

      var range = doc.GetRangeBySelect();
      if (!range) return JSON.stringify({ text: "", md: "" });

      var paragraphs = range.GetAllParagraphs();

      // Performance guard: fall back to simple text for large selections (UAT A8).
      // Count TOP-LEVEL paragraphs (NOT those inside table cells), not every paragraph:
      // GetAllParagraphs() includes cell-paragraphs, so a modest document with a few
      // small tables (e.g. 25 body ¶ + 9 tables = 106 cell-incl. ¶) wrongly tripped the
      // >100 guard and lost all markdown on select-all. A hard backstop on the raw count
      // (>500) still protects against a pathological table-heavy selection.
      var topLevelParaCount = 0;
      for (var pgi = 0; pgi < paragraphs.length; pgi++) {
        var inCell = false;
        try { inCell = !!(paragraphs[pgi].GetParentTableCell && paragraphs[pgi].GetParentTableCell()); } catch (e) {}
        if (!inCell) topLevelParaCount++;
      }
      if (topLevelParaCount > 100 || paragraphs.length > 500) {
        return JSON.stringify({ text: range.GetText(), md: "" });
      }

      var mdParts = [];
      var plainParts = [];
      var orderedCounters = {};

      // Detect tables in the selection range
      var allTables = doc.GetAllTables();
      var selStart = range.GetStartPos ? range.GetStartPos() : 0;
      var selEnd = range.GetEndPos ? range.GetEndPos() : 999999;

      // Build set of table ranges that overlap the selection
      // Also record the document-level table index for each, so injection
      // can find the same table later (selection may be lost by then).
      var tableRanges = [];
      for (var t = 0; t < allTables.length; t++) {
        var tbl = allTables[t];
        var tblRange = tbl.GetRange();
        if (!tblRange) continue;
        var tStart = tblRange.GetStartPos();
        var tEnd = tblRange.GetEndPos();
        if (tEnd >= selStart && tStart <= selEnd) {
          tableRanges.push({ table: tbl, start: tStart, end: tEnd, emitted: false, docIndex: t });
        }
      }

      // Pre-scan: collect unique indentation values from list paragraphs
      // to build a depth map (same approach as normalizeHtml margin-left mapping).
      // Sorted unique indents → index = nesting level.
      var indentSet = {};
      for (var ps = 0; ps < paragraphs.length; ps++) {
        if (isListParagraph(paragraphs[ps])) {
          var ind = paragraphs[ps].GetIndLeft ? paragraphs[ps].GetIndLeft() : 0;
          if (ind > 0) indentSet[ind] = true;
        }
      }
      var uniqueIndents = [];
      for (var key in indentSet) {
        if (indentSet.hasOwnProperty(key)) uniqueIndents.push(Number(key));
      }
      uniqueIndents.sort(function(a, b) { return a - b; });

      // Map an indent value to its depth (0-based)
      function indentToLevel(indLeft) {
        if (!indLeft || indLeft <= 0) return 0;
        for (var idx = 0; idx < uniqueIndents.length; idx++) {
          if (uniqueIndents[idx] === indLeft) return idx;
        }
        return 0;
      }

      var tableIndex = 0;
      var tableDocIndices = [];  // tableDocIndices[tableIndex] = doc-level index in GetAllTables()
      var tableSnapshots = [];   // tableSnapshots[tableIndex] = ToJSON(true,true) lossless snapshot
      var tableAmbiguity = null;
      var partialTableInfo = null;
      for (var p = 0; p < paragraphs.length; p++) {
        var para = paragraphs[p];
        var paraRange = para.GetRange();
        var pStart = paraRange ? paraRange.GetStartPos() : -1;

        // Check if this paragraph is inside a table
        var insideTable = false;
        for (var ti = 0; ti < tableRanges.length; ti++) {
          if (pStart >= tableRanges[ti].start && pStart <= tableRanges[ti].end) {
            // Analyze the table selection on first encounter
            if (!tableRanges[ti].emitted) {
              tableRanges[ti].emitted = true;
              if (!tableRanges[ti].analysis) {
                // Defensive: analyzeTableSelection touches OO table APIs that can throw
                // on degenerate structures; never let that crash the whole extraction.
                // Treat an analysis failure as "not involved" (fall through to text).
                try {
                  tableRanges[ti].analysis = analyzeTableSelection(tableRanges[ti].table, selStart, selEnd, paragraphs);
                } catch (_ate) {
                  tableRanges[ti].analysis = { full: false, selectedCells: [], ambiguous: false, reason: "analyze_error", notInvolved: true };
                }
              }
              var analysis = tableRanges[ti].analysis;
              if (analysis.notInvolved) {
                // Header/footer table false-overlap (see analyzeTableSelection):
                // the selection is structurally in no cell of this table. Fall
                // through to normal text extraction — insideTable stays false.
                tableRanges[ti].isNotInvolved = true;
              } else if (analysis.intraCell) {
                // Case 1: intra-cell — let paragraphs fall through to normal
                // paragraph extraction (same code path as non-table text)
                tableRanges[ti].isIntraCell = true;
                // insideTable stays false → this paragraph goes through paragraphToMarkdown
              } else if (analysis.ambiguous) {
                // Store ambiguity info for the result
                insideTable = true;
                if (!tableAmbiguity) {
                  tableAmbiguity = {
                    type: analysis.reason,
                    message: "La selection coupe un tableau de maniere ambigue. Selectionnez des lignes completes du tableau."
                  };
                }
              } else if (analysis.full) {
                // Full table — existing behavior
                insideTable = true;
                var tableCellsMd = extractTableCells(tableRanges[ti].table);
                mdParts.push({ md: "[TABLE:" + tableIndex + "]\n" + tableCellsMd + "\n[/TABLE]", isList: false });
                tableDocIndices.push(tableRanges[ti].docIndex);
                // Capture lossless table snapshot via ToJSON (borders, bg, merges, fonts, images)
                try {
                  tableSnapshots.push(tableRanges[ti].table.ToJSON(true, true));
                } catch (snapErr) {
                  tableSnapshots.push(null);
                }
                tableIndex = tableIndex + 1;
              } else {
                // Partial table — extract only selected cells
                insideTable = true;
                var partialCellsMd = extractPartialTableCells(tableRanges[ti].table, analysis.selectedCells);
                mdParts.push({ md: "[TABLE:" + tableIndex + "]\n" + partialCellsMd + "\n[/TABLE]", isList: false });
                tableDocIndices.push(tableRanges[ti].docIndex);
                // Capture FULL table snapshot even for partial selection —
                // unmodified cells retain original content from the snapshot
                try {
                  tableSnapshots.push(tableRanges[ti].table.ToJSON(true, true));
                } catch (snapErr) {
                  tableSnapshots.push(null);
                }
                if (!partialTableInfo) partialTableInfo = {};
                partialTableInfo[tableIndex] = analysis.selectedCells;
                tableIndex = tableIndex + 1;
              }
            } else {
              // Already emitted — check if intra-cell (paragraphs within selection fall through)
              if (tableRanges[ti].isIntraCell) {
                // Intra-cell: paragraphs within the selection fall through to normal handling
                // Paragraphs outside the selection are skipped (they belong to other cells)
                if (pStart < selStart || pStart > selEnd) {
                  insideTable = true;
                }
                // else: insideTable stays false → paragraph goes through paragraphToMarkdown
              } else if (tableRanges[ti].isNotInvolved) {
                // Header/footer false-overlap: this table is not part of the selection,
                // so the paragraph falls through to normal text extraction.
                // insideTable stays false.
              } else {
                insideTable = true;
              }
            }
            // Only stop scanning once a table actually CLAIMS this paragraph. A
            // not_involved table (header/footer position collision) must NOT end the
            // scan — the paragraph's REAL table can come later in tableRanges (the
            // spurious 0-position header tables are enumerated before body tables).
            if (!tableRanges[ti].isNotInvolved) break;
          }
        }
        if (insideTable) {
          plainParts.push(para.GetText());
          continue;
        }

        // Check for images
        var imgMarker = getDrawingMarker(para);
        if (imgMarker && imgMarker.isBlock) {
          mdParts.push({ md: imgMarker.md, isList: false });
          plainParts.push(para.GetText());
          continue;
        }

        // Detect block-level decoration: heading or list
        var headingLvl = getHeadingLevel(para);
        var listType = isListParagraph(para);
        var listInfo = null;
        if (listType) {
          // Prefer the true numbering level (ilvl) for nested lists; fall back to
          // the indent heuristic only for style-name-based lists (level === null).
          var lvl = (listType.level !== null && listType.level !== undefined)
            ? listType.level
            : indentToLevel(para.GetIndLeft ? para.GetIndLeft() : 0);
          listInfo = { type: listType.type, level: lvl };
        }

        // Compute clip bounds using text matching (not position arithmetic,
        // because OO positions don't map 1:1 to text characters).
        // range.GetText() is the ground truth of what's actually selected.
        var clipStart = 0;
        var clipEnd = 0;
        // Strip trailing \r\n paragraph mark — para.GetText() includes it
        // but the runs (annotatedParts) do not, causing a clip mismatch
        var paraText = (para.GetText ? para.GetText() : "").replace(/\r?\n$/, "");
        if ((p === 0 || p === paragraphs.length - 1) && paraText.length > 0) {
          // A selection ending at a paragraph END includes the trailing ¶ mark (\r\n)
          // in GetText() — MOUSE selections do; the API's ExpandTo does not. paraText is
          // already stripped, so strip rangeText too, otherwise the indexOf/suffix/prefix
          // matching below fails and clipStart stays 0 → the FULL paragraph is extracted
          // (bug A3: user selects « over the dog » but « Jumps over the dog » is sent to
          // the LLM). UAT-reproduced 2026-07-16 with a real mouse selection.
          var rangeText = (range.GetText ? range.GetText() : "").replace(/\r?\n$/, "");
          if (rangeText.length > 0) {
            if (p === 0 && paragraphs.length === 1 && rangeText.length < paraText.length) {
              // Single paragraph selection: find rangeText within paraText
              var idx = paraText.indexOf(rangeText);
              if (idx >= 0) {
                clipStart = idx;
                clipEnd = paraText.length - idx - rangeText.length;
              }
            } else if (p === 0 && paragraphs.length > 1) {
              // First paragraph of multi-paragraph: selected text is a suffix of paraText
              // rangeText starts with this suffix
              for (var sfx = paraText.length; sfx > 0; sfx--) {
                var suffix = paraText.substring(paraText.length - sfx);
                if (rangeText.substring(0, sfx) === suffix) {
                  clipStart = paraText.length - sfx;
                  break;
                }
              }
            } else if (p === paragraphs.length - 1 && paragraphs.length > 1) {
              // Last paragraph of multi-paragraph: selected text is a prefix of paraText
              // rangeText ends with this prefix
              for (var pfx = paraText.length; pfx > 0; pfx--) {
                var prefix = paraText.substring(0, pfx);
                if (rangeText.substring(rangeText.length - pfx) === prefix) {
                  clipEnd = paraText.length - pfx;
                  break;
                }
              }
            }
          }
        }



        // Regular paragraph — inline images are now handled inside paragraphToMarkdown
        var paraMarkdown = paragraphToMarkdown(para, clipStart, clipEnd);

        // §5bis extraction rule: a paragraph-level style MARKER (heading #, list
        // bullet/number) is emitted ONLY when the paragraph is FULLY selected.
        // A partially-selected ¶ (clipStart/clipEnd > 0 — e.g. the first/last ¶ of
        // a cross-¶ range) extracts as plain text + inline formatting only, with no
        // line-start marker (so re-injection treats it inline, not block). Char-level
        // formatting (bold/italic/…) is unaffected — it's handled per-run inside
        // paragraphToMarkdown.
        var fullySel = (clipStart === 0 && clipEnd === 0);

        // Apply heading prefix
        if (headingLvl > 0 && headingLvl <= 6 && fullySel) {
          var hashes = "";
          for (var h = 0; h < headingLvl; h++) hashes = hashes + "#";
          paraMarkdown = hashes + " " + paraMarkdown;
        }

        // Apply list prefix with nesting indentation (only for a fully-selected ¶)
        var emitList = listInfo && fullySel;
        if (emitList) {
          var indent = "";
          for (var li = 0; li < listInfo.level; li++) indent = indent + "  ";
          if (listInfo.type === "bullet") {
            paraMarkdown = indent + "- " + paraMarkdown;
          } else {
            // Track ordered list counters per nesting level
            if (!orderedCounters[listInfo.level]) orderedCounters[listInfo.level] = 0;
            orderedCounters[listInfo.level] = orderedCounters[listInfo.level] + 1;
            paraMarkdown = indent + orderedCounters[listInfo.level] + ". " + paraMarkdown;
          }
          // Reset deeper level counters when we're at a shallower level
          for (var rl = listInfo.level + 1; rl < 10; rl++) {
            orderedCounters[rl] = 0;
          }
        } else {
          // Not a (fully-selected) list item — reset all ordered counters
          orderedCounters = {};
        }

        mdParts.push({ md: paraMarkdown, isList: !!emitList });
        // Clip plain text to match selection bounds
        var paraPlain = paraText;
        if (clipStart > 0 || clipEnd > 0) {
          paraPlain = paraPlain.substring(clipStart, paraPlain.length - clipEnd);
        }
        plainParts.push(paraPlain);
      }

      // Join with \n between consecutive list items, \n\n between other blocks
      var mdLines = [];
      for (var j = 0; j < mdParts.length; j++) {
        if (j > 0) {
          var prevIsList = mdParts[j - 1].isList;
          var currIsList = mdParts[j].isList;
          mdLines.push((prevIsList && currIsList) ? "\n" : "\n\n");
        }
        mdLines.push(mdParts[j].md);
      }

      // Store table snapshots via Asc.scope (may be large, avoids JSON return size limits)
      Asc.scope.tableSnapshots = tableSnapshots.length > 0 ? tableSnapshots : null;

      return JSON.stringify({
        text: plainParts.join("\n"),
        md: mdLines.join(""),
        tableDocIndices: tableDocIndices,
        tableAmbiguity: tableAmbiguity,
        partialTableInfo: partialTableInfo,
        crossRefMeta: Asc.scope._crMeta || {},
        // [TEST HOOK] only when the driver is active (else undefined → omitted from
        // the JSON → prod return size unchanged; snapshots still go via Asc.scope/host).
        tableSnapshots: (Asc.scope._tReturnSnaps && tableSnapshots.length > 0) ? tableSnapshots : undefined
      });
  }

  // Callback for the selection-extraction callCommand (was the inline 4th arg
  // before the v3.2-03 refactor). Updates module caches and casts SELECTION_CHANGED.
  function onSelectionExtractResult(resultJson) {
      // false = read-write (allows SetName on images for stable naming)
      // Update module-level counters from Asc.scope
      imageCounter = window.Asc.scope.imgCounter || imageCounter;
      footnoteCounter = window.Asc.scope._fnCounter || footnoteCounter;
      crossRefCounter = window.Asc.scope._crCounter || crossRefCounter;
      var result;
      try {
        result = JSON.parse(resultJson);
      } catch (e) {
        result = { text: "", md: "" };
      }
      // Collapsed cursor (no real selection) — clear the chip instead of leaving the
      // previous selection (or refilling it with the clicked-into paragraph). See the
      // empty-selection gate inside the callCommand above.
      if (result && result.empty) {
        lastSelectedText = "";
        lastEnrichedMd = "";
        lastTableSnapshots = null;
        lastTableAmbiguity = null;
        lastPartialTableInfo = null;
        lastSelectedHtml = "";
        lastPolledNonEmpty = false;
        if (selectionSubscribed) castEmptySelection();
        return;
      }
      // Read crossRefMeta from JSON return (Asc.scope objects set inside callCommand may not persist)
      lastCrossRefMeta = result.crossRefMeta || {};
      var plainText = (result.text || "").replace(/^\s+|\s+$/g, "");

      lastSelectedText = plainText;
      lastEnrichedMd = result.md || "";
      lastTableDocIndices = result.tableDocIndices || [];
      // Prefer the reliable JSON return (test driver path); fall back to Asc.scope/host relay.
      lastTableSnapshots = result.tableSnapshots || window.Asc.scope.tableSnapshots || null;
      lastTableAmbiguity = result.tableAmbiguity || null;
      lastPartialTableInfo = result.partialTableInfo || null;
      lastSelectedHtml = ""; // No longer used for primary extraction

      // An image-only selection has empty plain text but a meaningful enriched md
      // (the image marker). Don't wipe it — that lost the image (nothing reached
      // the LLM / re-injection). Also make the selection "count" so Scribe can be
      // triggered on it (the AI_TEXT_ASSISTANT gate checks lastSelectedText.length).
      var mdHasImage = /!\[IMG:|\{\{IMG:/.test(lastEnrichedMd);
      if (!plainText) {
        if (mdHasImage) {
          lastSelectedText = lastEnrichedMd;
        } else {
          lastEnrichedMd = "";
        }
      }

      // Push selection to React only when panel is listening
      if (selectionSubscribed) {
        var selData = buildEditIntentData();
        selData.html = lastSelectedHtml || null;
        castIntent("SELECTION_CHANGED", selData, true);
      }
  }

  // ---- Required: button handler ----
  window.Asc.plugin.button = function(id) {
    this.executeCommand("close", "");
  };

  // ---- Context menu: show "Scribe" when text is selected ----
  window.Asc.plugin.event_onContextMenuShow = function(options) {
    if (options.type === "Selection") {
      this.executeMethod("AddContextMenuItem", [{
        guid: this.guid,
        items: [{
          id: "onClickScribe",
          text: {
            en: "Scribe",
            fr: "Scribe"
          }
        }]
      }]);
    }
  };

  // ---- Context menu click handler ----
  window.Asc.plugin.attachContextMenuClickEvent("onClickScribe", function() {
    log("Context menu 'Scribe' clicked");
    window.Asc.plugin.executeMethod("GetSelectedText", [{
      Numbering: false,
      Math: false,
      TableCellSeparator: "\n",
      ParaSeparator: "\n",
      TabSymbol: String.fromCharCode(9)
    }], function(selectedText) {
      lastSelectedText = selectedText || "";
      castScribeTriggerFresh();
    });
  });

  // ---- Ctrl+Shift+I unified handler ----
  // The plugin doesn't know panel state — it just emits intents. React decides.
  //
  // With text selected: casts AI_TEXT_ASSISTANT immediately.
  //   React handles double-tap detection and popover-to-panel transition.
  //   If panel is already open, React closes it on receiving AI_TEXT_ASSISTANT.
  // Without text selected: cast TOGGLE_SCRIBE_PANEL immediately.
  function handleCtrlShiftI(e) {
    var isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i");
    if (!isCtrlShiftI) return;
    e.preventDefault();

    // Decide from the LIVE selection, not the cached lastSelectedText. When the
    // panel is closed and the user collapses a selection to a bare cursor, OO
    // does not fire init() (initOnSelectionChanged is non-empty only) and the
    // poll is stopped, so lastSelectedText would be stale and we'd wrongly open
    // the inline popover. GetSelectedText is always current.
    window.Asc.plugin.executeMethod("GetSelectedText", [], function(txt) {
      if (txt && txt.length > 0) {
        log("Ctrl+Shift+I triggered Scribe");
        // #1: keyboard opens inline Scribe with a prepare-then-reveal window.
        // Cast with deferReveal so React mounts the popover hidden (prepared)
        // and reveals it after a short delay. The reveal timer lives on the
        // HOST (foreground document), NOT here: this plugin runs in a hidden
        // background iframe whose setTimeout is heavily throttled (a 20ms timer
        // fired after 250-440ms in practice), so addon-side timing is unusable.
        // The toolbar/context-menu paths cast without deferReveal -> open now.
        lastSelectedText = txt;
        castScribeTriggerFresh({ deferReveal: true });
      } else {
        log("Ctrl+Shift+I: toggle panel");
        lastSelectedText = "";
        castIntent("TOGGLE_SCRIBE_PANEL", {}, true);
      }
    });
  }

  // Undo/redo trigger the passive init() extraction (via the resulting
  // selection change), whose callCommand truncates the redo stack and breaks
  // redo. We suppress that extraction whenever an undo/redo is invoked.
  //
  // NOTE — two DISTINCT causes of "redo doesn't work", only one is ours:
  //   (a) THIS one — the plugin's own post-injection extraction callCommand wipes
  //       the redo stack. That is the plugin's fault and is what suppressExtraction
  //       fixes.
  //   (b) OO ALSO disables Redo natively in fast (non-strict) co-editing — verified
  //       in OO source; repro = a 2nd tab on the same doc. That is an OO PRODUCT
  //       behavior, NOT the plugin, and is unfixable here (product decision:
  //       coEditing 'strict'). See memory oo_redo_disabled_in_coediting. Don't chase
  //       (b) as a plugin bug.
  //
  // Two reasons the old 500ms window failed (Scribe's redo died ~1s after every
  // insert/replace, while keyboard redo survived):
  //   1. The plugin runs in a BACKGROUND iframe whose setTimeout is heavily
  //      throttled, so the debounced extraction fires ~1s later — AFTER a 500ms
  //      window — then its callCommand truncates redo. Window widened to 3000ms
  //      so the throttled fire is still caught.
  //   2. An extraction scheduled BEFORE this undo/redo (e.g. by Scribe's
  //      programmatic post-injection selection) was never cancelled, so it fired
  //      ~1s later regardless. Cancel the pending timer here too.
  function suppressExtraction() {
    suppressExtractionUntil = Date.now() + 3000;
    if (extractionDebounceTimer) { clearTimeout(extractionDebounceTimer); extractionDebounceTimer = null; }
  }

  // Keyboard: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z = redo.
  function handleUndoRedoKey(e) {
    var mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    var key = e.key;
    var isUndo = !e.shiftKey && (key === "z" || key === "Z");
    var isRedo = (key === "y" || key === "Y") || (e.shiftKey && (key === "z" || key === "Z"));
    if (isUndo || isRedo) suppressExtraction();
  }

  // Toolbar Undo/Redo buttons live in the OO editor document (window.parent,
  // same origin), so we can catch their clicks too — keyboard detection alone
  // misses mouse users, which broke undo/redo round-trips via the buttons.
  // OO button ids: id-toolbar-btn-undo / id-toolbar-btn-redo (slot-btn-*).
  function handleUndoRedoClick(e) {
    var t = e.target;
    if (t && t.closest && t.closest('[id*="btn-undo"],[id*="btn-redo"]')) {
      suppressExtraction();
    }
  }

  // While the mouse is held in the editor (e.g. dragging an image handle to
  // resize/move), suppress the selection-extraction callCommand — it re-enters the
  // editor and aborts OO's drag tracking (the image snaps back mid-drag). On
  // release, run the extraction once so selection state refreshes. (initOnSelection
  // Changed fires ~once at drag start, so the debounce alone fired mid-drag.)
  function handleEditorPointerDown() {
    pointerDown = true;
    if (extractionDebounceTimer) { clearTimeout(extractionDebounceTimer); extractionDebounceTimer = null; }
  }
  function handleEditorPointerUp() {
    if (!pointerDown) return;
    pointerDown = false;
    if (extractionDebounceTimer) { clearTimeout(extractionDebounceTimer); }
    extractionDebounceTimer = setTimeout(runSelectionExtraction, EXTRACTION_DEBOUNCE_MS);
  }

  // Attach pointer tracking to EVERY accessible frame document. The editor canvas
  // mousedown/pointerdown fires in an INNER OO frame, not window.parent.document —
  // attaching only there missed it (build .6 still snapped back). Walk the
  // same-origin frame tree from the top; cross-origin frames are skipped. Both
  // mouse and pointer events are bound (canvas may use Pointer Events). Re-run
  // after a delay since frames load after the plugin. addEventListener dedupes
  // identical (type, fn, capture), so re-attaching is safe.
  function attachPointerTrackingAll() {
    var seen = [];
    function bind(d) {
      try {
        d.addEventListener("mousedown", handleEditorPointerDown, true);
        d.addEventListener("mouseup", handleEditorPointerUp, true);
        d.addEventListener("pointerdown", handleEditorPointerDown, true);
        d.addEventListener("pointerup", handleEditorPointerUp, true);
      } catch (e) {}
    }
    function visit(w) {
      if (!w) return;
      var d; try { d = w.document; } catch (e) { return; } // cross-origin → skip
      if (!d) return;
      for (var s = 0; s < seen.length; s++) { if (seen[s] === d) return; }
      seen.push(d);
      bind(d);
      var fs; try { fs = w.frames; } catch (e) { return; }
      for (var i = 0; i < fs.length; i++) { try { visit(fs[i]); } catch (e) {} }
    }
    // Roots to walk DOWN from. We must NOT rely on window.top: in real Cozy Drive
    // the top page is a DIFFERENT origin (drive-rb.…) from the OO/plugin frames
    // (localhost), so starting at window.top reaches nothing and the canvas-frame
    // mousedown is never caught → pointerDown never set → the (throttled, ~1s)
    // extraction timer still fires mid-drag and the image snaps back. Instead climb
    // to the HIGHEST SAME-ORIGIN ancestor (the OO editor frame, same origin as the
    // plugin — its subtree contains the canvas frame) and walk down from there.
    var roots = [window];
    try {
      var anc = window;
      while (anc.parent && anc.parent !== anc) {
        try { void anc.parent.document; anc = anc.parent; } // same-origin → climb
        catch (e) { break; }                                 // cross-origin → stop
      }
      roots.push(anc);
    } catch (e) {}
    try { roots.push(window.top); } catch (e) {} // also try top (same-origin case)
    for (var ri = 0; ri < roots.length; ri++) { try { visit(roots[ri]); } catch (e) {} }
    // Safety net: a release anywhere (incl. outside the editor) clears the flag.
    try { window.addEventListener("mouseup", handleEditorPointerUp, true); } catch (e) {}
    try { window.addEventListener("pointerup", handleEditorPointerUp, true); } catch (e) {}
  }

  try {
    window.parent.document.addEventListener("keydown", handleCtrlShiftI);
    window.parent.document.addEventListener("keydown", handleUndoRedoKey);
    window.parent.document.addEventListener("click", handleUndoRedoClick, true);
    log("Ctrl+Shift+I shortcut registered on parent document");
  } catch (e) {
    log("Cannot register Ctrl+Shift+I on parent document: " + e.message);
    document.addEventListener("keydown", handleCtrlShiftI);
    document.addEventListener("keydown", handleUndoRedoKey);
    document.addEventListener("click", handleUndoRedoClick, true);
  }
  attachPointerTrackingAll();
  try { setTimeout(attachPointerTrackingAll, 1500); } catch (e) {}
  try { setTimeout(attachPointerTrackingAll, 4000); } catch (e) {}

  // ---- Toolbar button ----
  // Add a "Scribe" button in the OO toolbar (Plugins tab).
  // Available since OO 8.1 via AddToolbarMenuItem API.
  function addToolbarButton() {
    window.Asc.plugin.executeMethod("AddToolbarMenuItem", [{
      guid: window.Asc.plugin.guid,
      tabs: [{
        id: "plugins",
        items: [{
          id: "scribeToolbarBtn",
          type: "button",
          text: "Scribe",
          hint: "Scribe AI writing assistant",
          lockInViewMode: true,
          icons: "resources/%theme-type%(light|dark)/icon%scale%(default).%extension%(png)"
        }]
      }]
    }]);

    window.Asc.plugin.attachToolbarMenuClickEvent("scribeToolbarBtn", function() {
      triggerScribeIfSelection();
    });

    log("Toolbar button added");
  }

  // ---- "Assistant" toolbar tab ----
  // Our own ribbon tab, separate from the built-in "Plugins" tab and from the
  // native OO "AI" tab (which we disable host-side via editorConfig.plugins.
  // disable). It holds two explicit buttons — each with its own illustration —
  // for the two ways to open Scribe: the inline popover (acts on the current
  // selection) and the side panel. Both map to intents that already exist and
  // are handled React-side in useCozyBridge.js — this only adds new entry
  // points, no new core logic. The keyboard shortcut is the same Ctrl+Shift+I
  // for both (with a selection -> inline, without -> panel), surfaced in the
  // hints so users can discover it.
  function addAssistantTab() {
    window.Asc.plugin.executeMethod("AddToolbarMenuItem", [{
      guid: window.Asc.plugin.guid,
      tabs: [{
        id: "scribeAssistantTab",
        text: "Assistant",
        items: [
          {
            id: "scribeOpenInline",
            type: "button",
            // OO toolbar buttons render `text`/`hint` as plain strings only —
            // a {en,fr} object shows as "[object Object]" and kills the tooltip.
            // The plugin UI here is French-first (like the existing "Scribe"
            // button), so we use French strings.
            text: "Scribe en ligne",
            hint: "Ouvrir Scribe en ligne sur le texte sélectionné (Ctrl+Maj+I)",
            lockInViewMode: true,
            enableToggle: false,
            separator: false,
            icons: "resources/%theme-type%(light|dark)/icon-inline%scale%(default).%extension%(png)"
          },
          {
            id: "scribeOpenPanel",
            type: "button",
            text: "Panneau Scribe",
            hint: "Ouvrir/fermer le panneau latéral Scribe (Ctrl+Maj+I)",
            lockInViewMode: true,
            enableToggle: false,
            separator: false,
            icons: "resources/%theme-type%(light|dark)/icon-panel%scale%(default).%extension%(png)"
          }
        ]
      }]
    }]);

    window.Asc.plugin.attachToolbarMenuClickEvent("scribeOpenInline", openScribeInline);
    window.Asc.plugin.attachToolbarMenuClickEvent("scribeOpenPanel", openScribePanel);

    log("Assistant tab added");
  }

  // Inline mode: open the popover on the CURRENT selection. Read the live
  // selection (not cached lastSelectedText, which can be stale — see the
  // Ctrl+Shift+I handler) so the popover reflects what is selected right now.
  // With no selection the inline popover has nothing to act on, so we no-op.
  function openScribeInline() {
    window.Asc.plugin.executeMethod("GetSelectedText", [], function(txt) {
      if (txt && txt.length > 0) {
        log("Assistant > Scribe inline");
        lastSelectedText = txt;
        castScribeTriggerFresh();
      } else {
        log("Assistant > inline: no selection — ignored");
      }
    });
  }

  // Side-panel mode: toggle the Scribe side panel (host decides open/close).
  function openScribePanel() {
    log("Assistant > Scribe side panel");
    castIntent("TOGGLE_SCRIBE_PANEL", {}, true);
  }

  // Fallback: global toolbar click event
  window.Asc.plugin.event_onToolbarMenuClick = function(id) {
    if (id === "scribeToolbarBtn") {
      triggerScribeIfSelection();
    } else if (id === "scribeOpenInline") {
      openScribeInline();
    } else if (id === "scribeOpenPanel") {
      openScribePanel();
    }
  };

  function triggerScribeIfSelection() {
    if (lastSelectedText.length > 0) {
      castScribeTriggerFresh();
    } else {
      log("No text selected — toolbar click ignored");
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    log("Plugin loaded, Scribe trigger ready");
  });

  // ==========================================================================
  // DEV TEST HOOKS (T-03 selection-case harness) — FLAG-GATED, DEV-ONLY.
  // Never active in production: gated on localStorage "scribe.testHooks"==="1"
  // or window.__scribeTestForce===true (set explicitly by the test driver).
  //
  // Contract: test-harness/ORACLE-SCHEMA.md §1-§2. Driveable two ways so the
  // channel can be chosen at run time:
  //   (a) global  window.__scribeTest(cmd) -> Promise   (frame-eval driving)
  //   (b) postMessage {scribeTest, reqId, ...} -> {scribeTestResult,...}
  //                                                      (host-relay driving)
  // Determinism: injectFixture short-circuits the LLM and calls buildAndInject
  // directly; OO serializes callCommands, so a dumpState issued right after
  // injectFixture runs only once the injection callCommand has completed.
  // ==========================================================================
  function testHooksEnabled() {
    try {
      if (typeof window !== "undefined" && window.__scribeTestForce === true) return true;
      return (typeof localStorage !== "undefined" && localStorage.getItem("scribe.testHooks") === "1");
    } catch (e) {
      return (typeof window !== "undefined" && window.__scribeTestForce === true);
    }
  }

  // Parse a SELECTION-CASES spec into endpoints. Two endpoint forms:
  //   "P<n>@<pos>"                  → n-th TOP-LEVEL paragraph
  //   "T<n>.C(<r>,<c>)@<pos>"       → 1st ¶ of cell (r,c) of the n-th TABLE (intra-cell)
  //   "T<n>.C(<r>,<c>).P<m>@<pos>"  → m-th ¶ of that cell (multi-¶ intra-cell, A5/A6)
  // <pos> = start|space|mid|end|x|<int>. A range "<a>..<b>" must stay within the
  // SAME target (same paragraph, same table+cell — possibly ACROSS ¶s of that cell).
  function parseSelSpec(spec) {
    if (!spec) return null;
    var parts = String(spec).split("..");
    function one(p) {
      var m = /^\s*P(\d+)@(\w+)\s*$/.exec(p);
      if (m) return { n: parseInt(m[1], 10), kind: m[2], cell: null };
      // Cell + explicit ¶ index (multi-¶ intra-cell) — try BEFORE the plain cell form.
      var mcp = /^\s*T(\d+)\.C\((\d+),(\d+)\)\.P(\d+)@(\w+)\s*$/.exec(p);
      if (mcp) return { n: parseInt(mcp[1], 10), kind: mcp[5], cell: { r: parseInt(mcp[2], 10), c: parseInt(mcp[3], 10) }, para: parseInt(mcp[4], 10) };
      var mc = /^\s*T(\d+)\.C\((\d+),(\d+)\)@(\w+)\s*$/.exec(p);
      if (mc) return { n: parseInt(mc[1], 10), kind: mc[4], cell: { r: parseInt(mc[2], 10), c: parseInt(mc[3], 10) } };
      // Whole-table selection (T3): T<n>.full — no endpoint position.
      var mf = /^\s*T(\d+)\.full\s*$/.exec(p);
      if (mf) return { n: parseInt(mf[1], 10), kind: "full", cell: null, full: true };
      return null;
    }
    var a = one(parts[0]);
    var b = parts.length > 1 ? one(parts[1]) : a;
    if (!a || !b) return null;
    return { startN: a.n, startKind: a.kind, startCell: a.cell, startPara: a.para, endN: b.n, endKind: b.kind, endCell: b.cell, endPara: b.para, full: !!(a.full || b.full) };
  }

  // Which selection specs the driver can establish:
  //  • T<n>.full                            → whole table (T3)
  //  • P<n>@a..P<n>@b (SAME ¶)               → intra-paragraph (A0–A4)
  //  • T<n>.C(r,c)@a..T<n>.C(r,c)@b (SAME)   → intra-cell (T1/T8/T9)
  //  • T<n>.C(r1,c1)@..T<n>.C(r2,c2)@ (SAME table) → cross-cell range (T2a/b/c)
  //  • P<n>@a..T<m>.C(r,c)@b  /  T<m>.C(r,c)@a..P<n>@b  → ¶↔cell crossing (T4/T5)
  //  • T<m>.C(..)@..T<k>.C(..)@ (DIFFERENT tables)     → cross-table range (T6)
  // Cross-boundary works because OO's Range.ExpandTo()+Select() spans a ¶↔cell
  // boundary (probe-confirmed 2026-06-26) and snaps table-side ends to cell
  // boundaries. Multi-¶ top-level (A5/A6 — no cell on either side, different ¶)
  // rides the SAME cross branch: each endpoint is a collapsed ¶ range, ExpandTo'd.
  function selSpecSupported(p) {
    if (p.full) return true;
    var sc = p.startCell, ec = p.endCell;
    if (!sc && !ec) return true;                      // intra-¶ (A0–A4) OR multi-¶ top-level (A5/A6)
    if (sc && ec && p.startN === p.endN) return true; // intra-cell OR cross-cell, same table
    return true;                                      // cross-boundary: ¶↔cell or cross-table
  }
  // True when the two endpoints live in DIFFERENT targets (¶↔cell, or cells of
  // two different tables) — handled by the cross-boundary establishment branch,
  // distinct from the same-table multi-cell "range" path (T2a/b/c).
  function selSpecCross(p) {
    var sc = p.startCell, ec = p.endCell;
    return (!!sc !== !!ec) || !!(sc && ec && p.startN !== p.endN);
  }
  // Kept for the intra-target fast path (collapsed-cursor handling).
  function selSpecSameTarget(p) {
    if (p.startN !== p.endN) return false;
    var sc = p.startCell, ec = p.endCell;
    if (!sc && !ec) return true;
    return !!(sc && ec && sc.r === ec.r && sc.c === ec.c);
  }

  function hookSetSelection(spec) {
    return new Promise(function(resolve) {
      var p = parseSelSpec(spec);
      if (!p) { resolve({ ok: false, error: "bad selection spec: " + spec }); return; }
      if (!selSpecSupported(p)) {
        // Multi-paragraph (A5/A6) / ¶↔cell crossing / cross-table — out of scope.
        resolve({ ok: false, error: "selection spec not supported: " + spec });
        return;
      }
      Asc.scope._selspec = JSON.stringify(p);
      window.Asc.plugin.callCommand(function() {
        var p = JSON.parse(Asc.scope._selspec);
        var doc = Api.GetDocument();

        // Cross-boundary (T4/T5/T6): start & end in DIFFERENT targets (¶↔cell, or
        // cells of two different tables). Resolve each endpoint — partial for a ¶
        // endpoint (collapsed at offset), whole first/last ¶ for a cell endpoint —
        // then ExpandTo their union. OO snaps table ends to cell boundaries, so
        // every cell between is fully included (probe-confirmed).
        // Multi-¶ top-level (A5/A6: !startCell && !endCell && startN !== endN)
        // joins the cross branch — _xEndpoint's !cell path resolves each ¶ endpoint.
        var _isCross = (!!p.startCell !== !!p.endCell) || (p.startCell && p.endCell && p.startN !== p.endN) || (!p.startCell && !p.endCell && p.startN !== p.endN);
        if (_isCross) {
          function _xNth(kind, nn) {
            var c = doc.GetElementsCount(), s = 0;
            for (var i = 0; i < c; i++) { var e = doc.GetElement(i); if (e.GetClassType && e.GetClassType() === kind) { s++; if (s === nn) return e; } }
            return null;
          }
          function _xParaRange(para, kind) {
            var txt = (para.GetText ? para.GetText() : "").replace(/[\r\n]+$/, ""), len = txt.length, off;
            if (/^\d+$/.test(kind)) { off = parseInt(kind, 10); if (off > len) off = len; }
            else if (kind === "end") off = len;
            else if (kind === "mid") off = Math.floor(len / 2);
            else if (kind === "space") { var ix = txt.indexOf(" "); off = ix >= 0 ? ix + 1 : 0; }
            else off = 0;
            var cnt = para.GetElementsCount ? para.GetElementsCount() : 0, acc = 0;
            for (var i = 0; i < cnt; i++) {
              var el = para.GetElement(i), ct = el.GetClassType ? el.GetClassType() : "";
              if (ct !== "run" && ct !== "hyperlink") continue;
              var t = (el.GetText ? el.GetText() : "").replace(/[\r\n]+$/, "");
              if (off <= acc + t.length) return el.GetRange ? el.GetRange(off - acc, off - acc) : null;
              acc += t.length;
            }
            return para.GetRange ? para.GetRange() : null;
          }
          function _xEndpoint(nn, kind, cell, isStart) {
            if (!cell) { var pp = _xNth("paragraph", nn); return pp ? _xParaRange(pp, kind) : null; }
            var tb = _xNth("table", nn); if (!tb) return null;
            var cl = tb.GetCell(cell.r, cell.c); if (!cl) return null;
            var cc = cl.GetContent(), pe = isStart ? cc.GetElement(0) : cc.GetElement(cc.GetElementsCount() - 1);
            return pe && pe.GetRange ? pe.GetRange() : null;
          }
          var _xsr = _xEndpoint(p.startN, p.startKind, p.startCell, true);
          var _xer = _xEndpoint(p.endN, p.endKind, p.endCell, false);
          if (!_xsr || !_xer) return JSON.stringify({ ok: false, error: "cross endpoint not found" });
          var _xrng = _xsr.ExpandTo ? _xsr.ExpandTo(_xer) : null;
          if (_xrng && _xrng.Select) _xrng.Select();
          return JSON.stringify({ ok: true, mode: "cross" });
        }

        // Multi-cell range (T2a/b/c) or whole table (T3): select from the start
        // cell's 1st ¶ to the end cell's last ¶ and ExpandTo their union. OO snaps
        // both ends to cell boundaries, so GetAllParagraphs() of the resulting
        // selection covers every cell in between — which is what the prod table
        // path (analyzeTableSelection → GetParentTableCell) reads.
        var _isRange = p.full || (p.startCell && p.endCell && (p.startCell.r !== p.endCell.r || p.startCell.c !== p.endCell.c));
        if (_isRange) {
          var _rc = doc.GetElementsCount(), _rs = 0, _rt = null;
          for (var _ri = 0; _ri < _rc; _ri++) {
            var _re = doc.GetElement(_ri);
            if (_re.GetClassType && _re.GetClassType() === "table") { _rs++; if (_rs === p.startN) { _rt = _re; break; } }
          }
          if (!_rt) return JSON.stringify({ ok: false, error: "table " + p.startN + " not found" });
          var _sc, _ec;
          if (p.full) {
            _sc = _rt.GetCell(0, 0);
            var _lr = _rt.GetRowsCount() - 1;
            _ec = _rt.GetCell(_lr, _rt.GetRow(_lr).GetCellsCount() - 1);
          } else {
            _sc = _rt.GetCell(p.startCell.r, p.startCell.c);
            _ec = _rt.GetCell(p.endCell.r, p.endCell.c);
          }
          if (!_sc || !_ec) return JSON.stringify({ ok: false, error: "range cell not found" });
          var _scC = _sc.GetContent(), _ecC = _ec.GetContent();
          var _sp = _scC.GetElement(0), _ep = _ecC.GetElement(_ecC.GetElementsCount() - 1);
          var _sr = _sp && _sp.GetRange ? _sp.GetRange() : null;
          var _er = _ep && _ep.GetRange ? _ep.GetRange() : null;
          var _rng = (_sr && _er && _sr.ExpandTo) ? _sr.ExpandTo(_er) : (_sr || _er);
          if (_rng && _rng.Select) _rng.Select();
          return JSON.stringify({ ok: true, mode: p.full ? "full" : "cellrange", full: !!p.full });
        }

        var target = null, endTarget = null;
        if (p.startCell) {
          // n-th TABLE → cell (r,c) → start ¶ (startPara, default 1) + end ¶ (endPara).
          // Different paras ⇒ multi-¶ intra-cell selection (A5/A6).
          var tcnt = doc.GetElementsCount(), tseen = 0, tbl = null;
          for (var ti = 0; ti < tcnt; ti++) {
            var tel = doc.GetElement(ti);
            if (tel.GetClassType && tel.GetClassType() === "table") { tseen++; if (tseen === p.startN) { tbl = tel; break; } }
          }
          if (tbl) { try { var _cont = tbl.GetCell(p.startCell.r, p.startCell.c).GetContent(); target = _cont.GetElement((p.startPara || 1) - 1); endTarget = _cont.GetElement((p.endPara || 1) - 1); } catch (e) {} }
        } else {
          var count = doc.GetElementsCount(), seen = 0;
          for (var i = 0; i < count; i++) {
            var el = doc.GetElement(i);
            if (el.GetClassType && el.GetClassType() === "paragraph") { seen++; if (seen === p.startN) { target = el; break; } }
          }
          endTarget = target;
        }
        if (!target) return JSON.stringify({ ok: false, error: "target not found (P/cell " + p.startN + ")" });
        // GetText() includes the trailing paragraph mark "\r\n" (and a cell's LAST ¶
        // adds a terminator "\t") — strip both for char length.
        var txt = (target.GetText ? target.GetText() : "").replace(/[\r\n\t]+$/, "");
        var len = txt.length;
        var sk = p.startKind, ek = p.endKind;
        // Offset within a GIVEN ¶ (used for the end ¶ in a multi-¶ intra-cell range).
        function offOfPara(paraEl, kind) {
          var t = (paraEl && paraEl.GetText ? paraEl.GetText() : "").replace(/[\r\n\t]+$/, ""), l = t.length;
          if (/^\d+$/.test(kind)) { var n = parseInt(kind, 10); return n > l ? l : n; }
          if (kind === "end") return l;
          if (kind === "mid") return Math.floor(l / 2);
          if (kind === "space") { var idx = t.indexOf(" "); return idx >= 0 ? idx + 1 : 0; }
          return 0;
        }
        function resolveOffset(kind) { return offOfPara(target, kind); }
        // Build a COLLAPSED range at char offset `off` by walking runs/hyperlinks
        // and using per-element GetRange(inOff,inOff) — char-reliable WITHIN one
        // element. (Document-absolute positions count element boundaries, so plain
        // char math mis-selects across runs; this avoids that.)
        function rangeAtChar(para, off) {
          var cnt = para.GetElementsCount ? para.GetElementsCount() : 0, acc = 0;
          for (var i = 0; i < cnt; i++) {
            var el = para.GetElement(i);
            var ct = el.GetClassType ? el.GetClassType() : "";
            if (ct !== "run" && ct !== "hyperlink") continue;
            var t = (el.GetText ? el.GetText() : "").replace(/[\r\n]+$/, "");
            if (off <= acc + t.length) {
              var inOff = off - acc;
              return el.GetRange ? el.GetRange(inOff, inOff) : null;
            }
            acc += t.length;
          }
          return null; // off past end
        }
        var rng = null;
        if (endTarget && endTarget !== target) {
          // MULTI-¶ intra-cell (A5/A6): ExpandTo the two per-¶ collapsed offsets.
          var mra = rangeAtChar(target, offOfPara(target, sk));
          var mrb = rangeAtChar(endTarget, offOfPara(endTarget, ek));
          if (mra && mrb && mra.ExpandTo) rng = mra.ExpandTo(mrb); else rng = mra || mrb;
          if (rng && rng.Select) rng.Select();
          return JSON.stringify({ ok: true, mode: "cellmultipara", sPara: p.startPara || 1, ePara: p.endPara || 1 });
        }
        var s = resolveOffset(sk), e = resolveOffset(ek);
        if (s === 0 && e === len) {
          // Whole paragraph — GetRange() no-args is reliable regardless of run count.
          rng = target.GetRange ? target.GetRange() : null;
        } else if (s === e) {
          // Collapsed cursor (A0 @x, A2 @mid).
          rng = rangeAtChar(target, s) || (target.GetRange ? target.GetRange(0, 0) : null);
        } else {
          // Range — collapse at both endpoints then ExpandTo (union of the two
          // collapsed ranges, cf selectByRefs). rangeAtChar(len) lands collapsed
          // at the end of the last run, so @end works without a special case.
          var ra = rangeAtChar(target, s);
          var rb = rangeAtChar(target, e);
          if (ra && rb && ra.ExpandTo) rng = ra.ExpandTo(rb);
          else rng = ra || rb;
        }
        if (rng && rng.Select) rng.Select();
        return JSON.stringify({ ok: true, paraLen: len, mode: sk + ".." + ek, s: s, e: e });
      }, false, false, function(ret) {
        try { resolve(JSON.parse(ret)); } catch (e) { resolve({ ok: false, error: "setSelection parse: " + e }); }
      });
    });
  }

  function hookInjectFixture(md, mode) {
    return new Promise(function(resolve) {
      try {
        Asc.scope._testSelSpec = null; // never apply a stale test selection
        buildAndInject(md, mode === "insert" ? "insert" : "replace", null);
        resolve({ ok: true }); // dumpState issued next will run after this callCommand (OO serializes)
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  // Atomic set-selection + inject (one callCommand) — needed for COLLAPSED
  // cursors (A0/A2): a cursor set by a separate setSelection callCommand resets
  // to offset 0 before injectFixture runs. The spec is queued in Asc.scope and
  // applied at the top of buildAndInject's own callCommand (see [TEST HOOK]).
  function hookInjectAtSelection(spec, md, mode) {
    return new Promise(function(resolve) {
      var p = parseSelSpec(spec);
      if (!p) { resolve({ ok: false, error: "bad selection spec: " + spec }); return; }
      if (!selSpecSupported(p)) {
        resolve({ ok: false, error: "selection spec not supported: " + spec });
        return;
      }
      try {
        Asc.scope._testSelSpec = JSON.stringify(p);
        buildAndInject(md, mode === "insert" ? "insert" : "replace", null);
        resolve({ ok: true, spec: spec });
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  }

  function hookDumpState(scope) {
    return new Promise(function(resolve) {
      window.Asc.plugin.callCommand(function() {
        var doc = Api.GetDocument();

        function runFlags(tp) {
          var r = {};
          if (!tp) return r;
          if (tp.GetBold && tp.GetBold()) r.b = 1;
          if (tp.GetItalic && tp.GetItalic()) r.i = 1;
          if (tp.GetStrikeout && tp.GetStrikeout()) r.s = 1;
          if (tp.GetUnderline && tp.GetUnderline()) r.u = 1;
          var ff = tp.GetFontFamily ? tp.GetFontFamily() : null;
          if (ff) {
            var f = ff.toLowerCase();
            if (f.indexOf("courier") !== -1 || f.indexOf("consolas") !== -1 || f.indexOf("mono") !== -1) r.code = 1;
          }
          return r;
        }
        function paraToBlock(para) {
          var runs = [];
          var n = para.GetElementsCount ? para.GetElementsCount() : 0;
          for (var i = 0; i < n; i++) {
            var el = para.GetElement(i);
            var ct = el.GetClassType ? el.GetClassType() : "";
            if (ct === "run") {
              var t = el.GetText ? el.GetText() : "";
              if (t === "") continue;
              var fl = runFlags(el.GetTextPr ? el.GetTextPr() : null);
              fl.t = t;
              runs.push(fl);
            } else if (ct === "hyperlink") {
              var ht = "", first = null;
              var hc = el.GetElementsCount ? el.GetElementsCount() : 0;
              for (var h = 0; h < hc; h++) {
                var ch = el.GetElement(h);
                var cht = ch.GetText ? ch.GetText() : "";
                if (cht) { ht += cht; if (!first) first = ch; }
              }
              if (ht) {
                var fl2 = first ? runFlags(first.GetTextPr ? first.GetTextPr() : null) : {};
                fl2.t = ht;
                var url = el.GetLinkedText ? el.GetLinkedText() : "";
                if (url) fl2.link = url;
                runs.push(fl2);
              }
            }
          }
          var pblock = { type: "p", runs: runs };
          try {
            var pst = para.GetStyle ? para.GetStyle() : null;
            var psn = (pst && pst.GetName) ? pst.GetName() : null;
            if (psn && psn !== "Normal") pblock.style = psn;
            var plvl = para.GetOutlineLvl ? para.GetOutlineLvl() : -1;
            if (typeof plvl === "number" && plvl >= 0) pblock.lvl = plvl;
          } catch (e) {}
          return pblock;
        }
        function cellToBlocks(cell) {
          var blocks = [];
          var c = cell && cell.GetContent ? cell.GetContent() : null;
          if (!c) return blocks;
          var n = c.GetElementsCount();
          for (var i = 0; i < n; i++) {
            var el = c.GetElement(i);
            if (el.GetClassType && el.GetClassType() === "paragraph") blocks.push(paraToBlock(el));
            // nested tables: out of spike scope (T13)
          }
          return blocks;
        }
        function tableToBlock(tbl) {
          var grid = [];
          var rc = tbl.GetRowsCount();
          for (var r = 0; r < rc; r++) {
            var row = tbl.GetRow(r);
            var cc = row.GetCellsCount();
            var cells = [];
            for (var ci = 0; ci < cc; ci++) {
              var cell = tbl.GetCell(r, ci);
              cells.push({ blocks: cell ? cellToBlocks(cell) : [] });
              // vmerge/hspan: deferred (T12) — captured in a later iteration
            }
            grid.push(cells);
          }
          return { type: "table", grid: grid };
        }

        // §Oracle-selection — describe a selection by the TEXT IT COVERS, not by
        // OO position units. `offset` (pos - blockStart) counts every element
        // boundary, INCLUDING empty runs — which paraToBlock deliberately skips
        // (l.5237) and normalizeModel filters again. So `blocks` calls an empty run
        // noise while `offset` counts it: a purely cosmetic change (the inject paths
        // leave empty-run litter) silently shifts the numbers with nothing visible
        // changing, and — worse — an off-by-one that eats a host character reads as
        // an opaque "offset: 10" that no reviewer can catch. It did: the A6/insert
        // golden froze a post-selection covering one extra host char.
        // markParagraph maps each CHARACTER to its OO position and brackets the ones
        // inside the selection, giving a reviewable « ... » rendering.
        function markParagraph(para, selStart, selEnd) {
          var s = "", opened = false;
          for (var j = 0; j < para.GetElementsCount(); j++) {
            var run = para.GetElement(j);
            if (!run.GetClassType || run.GetClassType() !== "run") continue;
            var tx = run.GetText ? run.GetText() : "";
            if (tx === "") continue; // empty run: no characters to mark
            for (var k = 0; k < tx.length; k++) {
              var p = -1;
              try { p = run.GetRange(k, k).GetStartPos(); } catch (eP) {}
              var inSel = (p >= selStart && p < selEnd);
              if (inSel && !opened) { s += "«"; opened = true; }
              if (!inSel && opened) { s += "»"; opened = false; }
              s += tx[k];
            }
          }
          if (opened) s += "»";
          return s;
        }
        // Only paragraphs the selection actually touches are marked (the rest is
        // noise, and a8-large would emit 120 lines). MARK_CAP bounds the per-char
        // GetRange cost; truncation is REPORTED, never silent.
        var MARK_CAP = 8;
        var markLines = [], markTruncated = false;
        function markIfSelected(para, selStart, selEnd, label) {
          if (selStart < 0) return;
          var rg = para.GetRange ? para.GetRange() : null;
          if (!rg) return;
          var ps = rg.GetStartPos(), pe = rg.GetEndPos();
          if (pe < selStart || ps > selEnd) return; // no overlap
          if (markLines.length >= MARK_CAP) { markTruncated = true; return; }
          markLines.push({ at: label, text: markParagraph(para, selStart, selEnd) });
        }

        var blocks = [], blockRanges = [], cellRanges = [];
        var bc = doc.GetElementsCount();
        for (var i = 0; i < bc; i++) {
          var el = doc.GetElement(i);
          var ct = el.GetClassType ? el.GetClassType() : "";
          if (ct === "paragraph") {
            var idx = blocks.length;
            blocks.push(paraToBlock(el));
            var rg = el.GetRange ? el.GetRange() : null;
            blockRanges.push({
              idx: idx,
              el: el, // kept so selMarkup can bracket this ¶ once the selection is known
              start: rg && rg.GetStartPos ? rg.GetStartPos() : -1,
              end: rg && rg.GetEndPos ? rg.GetEndPos() : -1
            });
          } else if (ct === "table") {
            var tblIdx = blocks.length;
            blocks.push(tableToBlock(el));
            // Index every cell paragraph's range so an intra-cell selection can be
            // located (§ T-règles-intra V3). Without this, a selection inside a cell
            // matches no top-level range and reports block:-1 (post-selection blind).
            try {
              var trc = el.GetRowsCount ? el.GetRowsCount() : 0;
              for (var tr = 0; tr < trc; tr++) {
                var trow = el.GetRow(tr);
                var tcc = trow && trow.GetCellsCount ? trow.GetCellsCount() : 0;
                for (var tc = 0; tc < tcc; tc++) {
                  var tcell = el.GetCell(tr, tc);
                  var tcont = tcell && tcell.GetContent ? tcell.GetContent() : null;
                  if (!tcont) continue;
                  var tpn = tcont.GetElementsCount ? tcont.GetElementsCount() : 0;
                  for (var tpi = 0; tpi < tpn; tpi++) {
                    var tcp = tcont.GetElement(tpi);
                    if (!tcp || !tcp.GetClassType || tcp.GetClassType() !== "paragraph") continue;
                    var tcr = tcp.GetRange ? tcp.GetRange() : null;
                    if (!tcr) continue;
                    cellRanges.push({
                      block: tblIdx, cell: { r: tr, c: tc }, cellBlock: tpi, el: tcp,
                      start: tcr.GetStartPos ? tcr.GetStartPos() : -1,
                      end: tcr.GetEndPos ? tcr.GetEndPos() : -1
                    });
                  }
                }
              }
            } catch (eCells) {}
          }
        }

        var sel = null, selText = null;
        var srange = doc.GetRangeBySelect ? doc.GetRangeBySelect() : null;
        if (srange) {
          var ss = srange.GetStartPos ? srange.GetStartPos() : -1;
          var se = srange.GetEndPos ? srange.GetEndPos() : -1;
          var locate = function(pos) {
            for (var k = 0; k < blockRanges.length; k++) {
              var br = blockRanges[k];
              if (pos >= br.start && pos <= br.end) return { block: br.idx, offset: pos - br.start };
            }
            // Intra-cell: report the table block index + cell coords + the paragraph
            // index within the cell + offset within that paragraph (§ T-règles-intra V3).
            for (var kc = 0; kc < cellRanges.length; kc++) {
              var cr = cellRanges[kc];
              if (pos >= cr.start && pos <= cr.end)
                return { block: cr.block, cell: cr.cell, cellBlock: cr.cellBlock, offset: pos - cr.start };
            }
            return { block: -1, offset: -1 };
          };
          sel = { start: locate(ss), end: locate(se) };
          selText = srange.GetText ? srange.GetText() : null;
          // Mark every ¶ the selection touches, top-level then intra-cell, in
          // document order.
          for (var mb = 0; mb < blockRanges.length; mb++) {
            markIfSelected(blockRanges[mb].el, ss, se, { block: blockRanges[mb].idx });
          }
          for (var mc = 0; mc < cellRanges.length; mc++) {
            var crr = cellRanges[mc];
            markIfSelected(crr.el, ss, se, { block: crr.block, cell: crr.cell, cellBlock: crr.cellBlock });
          }
        }

        return JSON.stringify({
          blocks: blocks,
          selection: sel,       // OO position units — DEBUG ONLY, not an oracle (see §Oracle-selection)
          selText: selText,     // the text the selection actually covers
          selMarkup: markLines, // that text in situ, bracketed « » — the reviewable form
          selMarkupTruncated: markTruncated || undefined
        });
      }, false, false, function(ret) {
        try { resolve(JSON.parse(ret)); } catch (e) { resolve({ error: "dumpState parse: " + e }); }
      });
    });
  }

  // Run the REAL selection extraction (window.Asc.plugin.init path) on the current
  // selection and return the enriched markdown + plain text it produced. Lets the
  // harness capture the EXTRACTION side of §5bis (conditional ¶-style markers) and,
  // later, table-cell extraction — the round-trip counterpart of injectFixture.
  function hookExtractSelection() {
    return new Promise(function(resolve) {
      // Sentinel: init()'s extraction callback overwrites these. Poll until it
      // runs (its callCommand completes asynchronously, after this call returns).
      lastEnrichedMd = "__pending__";
      lastSelectedText = "__pending__";
      // Call the extraction directly (not init()) so the dev-hook bypasses the
      // selection-change debounce and stays deterministic.
      try { runSelectionExtraction(); } catch (e) {}
      var tries = 0;
      function check() {
        tries++;
        var done = (lastSelectedText !== "__pending__") || (lastEnrichedMd !== "__pending__");
        if (done || tries > 30) {
          resolve({
            ok: true,
            text: lastSelectedText === "__pending__" ? "" : lastSelectedText,
            md: lastEnrichedMd === "__pending__" ? "" : lastEnrichedMd,
            tries: tries
          });
        } else {
          setTimeout(check, 120);
        }
      }
      setTimeout(check, 120);
    });
  }

  // DEV PROBE (§4quater). Reports the raw ingredients of the header/footer-table
  // "position collision" so a synthetic fixture can be proven to reproduce the bug
  // condition against the real reference doc, instead of eyeballing OOXML.
  //   - allTables : doc.GetAllTables() (INCLUDES header/footer tables) — each with
  //     its GetRange() [start,end], dims, first-cell text, and isBody flag.
  //   - bodyTables: tables reached via doc.GetElement (the body coordinate space).
  //   - topOfBody : the first body element's range = a deterministic "selection at
  //     the top of the body" proxy, plus the buggy predicate hits against it.
  // Collision reproduced  <=>  some allTable with isBody:false is in
  // topOfBody.predicateHits (a header/footer table spuriously "overlaps" a
  // top-of-body selection). Flag-gated; never runs in production.
  function hookProbeTables() {
    return new Promise(function(resolve) {
      window.Asc.plugin.callCommand(function() {
        var doc = Api.GetDocument();
        function rng(el) {
          var r = el && el.GetRange ? el.GetRange() : null;
          return r ? { s: r.GetStartPos(), e: r.GetEndPos() } : { s: -1, e: -1 };
        }
        function tdims(t) {
          var rows = t.GetRowsCount ? t.GetRowsCount() : 0, cols = 0, first = "";
          if (rows > 0) {
            var row0 = t.GetRow(0);
            cols = row0 && row0.GetCellsCount ? row0.GetCellsCount() : 0;
            var c0 = t.GetCell(0, 0);
            var cc = c0 && c0.GetContent ? c0.GetContent() : null;
            var n = cc && cc.GetElementsCount ? cc.GetElementsCount() : 0;
            for (var k = 0; k < n && first.length < 40; k++) {
              var e = cc.GetElement(k);
              if (e && e.GetText) first += e.GetText();
            }
          }
          return { rows: rows, cols: cols, first: first.slice(0, 40) };
        }
        var bodyInfo = [], bc = doc.GetElementsCount();
        for (var j = 0; j < bc; j++) {
          var bel = doc.GetElement(j);
          if (bel && bel.GetClassType && bel.GetClassType() === "table") {
            var br = rng(bel), bd = tdims(bel);
            bodyInfo.push({ elem: j, start: br.s, end: br.e, rows: bd.rows, cols: bd.cols, first: bd.first });
          }
        }
        function isBodyTable(d) {
          for (var b = 0; b < bodyInfo.length; b++) {
            if (bodyInfo[b].rows === d.rows && bodyInfo[b].cols === d.cols && bodyInfo[b].first === d.first) return true;
          }
          return false;
        }
        var all = doc.GetAllTables ? doc.GetAllTables() : [], allInfo = [];
        for (var i = 0; i < all.length; i++) {
          var r = rng(all[i]), d = tdims(all[i]);
          allInfo.push({ i: i, start: r.s, end: r.e, rows: d.rows, cols: d.cols, first: d.first, isBody: isBodyTable(d) });
        }
        function predicate(selS, selE) {
          var hits = [];
          for (var k = 0; k < allInfo.length; k++) {
            if (allInfo[k].end >= selS && allInfo[k].start <= selE) hits.push(allInfo[k].i);
          }
          return hits;
        }
        var topEl = bc > 0 ? doc.GetElement(0) : null, topR = topEl ? rng(topEl) : { s: -1, e: -1 };
        var srange = doc.GetRangeBySelect ? doc.GetRangeBySelect() : null;
        var liveSel = srange ? { start: srange.GetStartPos(), end: srange.GetEndPos() } : null;
        var topHits = predicate(topR.s, topR.e);
        var spurious = [];
        for (var s = 0; s < topHits.length; s++) {
          if (!allInfo[topHits[s]].isBody) spurious.push(topHits[s]);
        }
        return JSON.stringify({
          allTables: allInfo,
          bodyTables: bodyInfo,
          extraTables: allInfo.length - bodyInfo.length,
          topOfBody: { start: topR.s, end: topR.e, predicateHits: topHits, spuriousHeaderFooterHits: spurious },
          liveSelection: liveSel ? { start: liveSel.start, end: liveSel.end, predicateHits: predicate(liveSel.start, liveSel.end) } : null,
          collisionReproduced: spurious.length > 0
        });
      }, false, false, function(ret) {
        try { resolve(JSON.parse(ret)); } catch (e) { resolve({ error: "probeTables parse: " + e }); }
      });
    });
  }

  function runTestCmd(action, params) {
    if (!testHooksEnabled()) return Promise.resolve({ ok: false, error: "test hooks disabled" });
    if (action === "setSelection") return hookSetSelection(params.spec);
    if (action === "injectFixture") return hookInjectFixture(params.md, params.mode);
    if (action === "injectAtSelection") return hookInjectAtSelection(params.spec, params.md, params.mode);
    if (action === "dumpState") return hookDumpState(params.scope || "region");
    if (action === "extractSelection") return hookExtractSelection();
    if (action === "probeTables") return hookProbeTables();
    return Promise.resolve({ ok: false, error: "unknown scribeTest action: " + action });
  }

  // Channel (a): direct global, for frame-eval driving (Chrome DevTools / MCP).
  window.__scribeTest = function(cmd) {
    cmd = cmd || {};
    return runTestCmd(cmd.action, cmd);
  };

  // Channel (b): postMessage, for host-relay driving.
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || typeof msg.scribeTest !== "string") return;
    var action = msg.scribeTest, reqId = msg.reqId;
    runTestCmd(action, msg).then(function(res) {
      var reply = { scribeTestResult: action, reqId: reqId };
      if (action === "dumpState") {
        reply.model = { blocks: res.blocks, selection: res.selection };
        if (res.error) reply.error = res.error;
      } else {
        reply.ok = res.ok !== false;
        if (res.error) reply.error = res.error;
      }
      postToAncestors(reply);
    });
  });

})(window, undefined);
