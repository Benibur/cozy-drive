---
gsd_state_version: 1.0
milestone: v3.3
milestone_name: Fidélité d'injection image
status: 28-02 core observables (IMG-01..05) + IMG-04 save-fidelity VERIFIED live (build 2026-07-09.6, commit ba54d6306); residual follow-ups Q1 floating / Q3 cross-origin / T9 re-run deferred (non-blocking)
last_updated: "2026-07-09T00:00:00.000Z"
last_activity: 2026-07-09 -- undo=1 + live render + IMG-04 save-fidelity all VERIFIED live; save bug (blip lost at save) root-caused (recalculate=false) & fixed (recalculate=true / Reassign_ImageUrls) via /gsd-debug, committed ba54d6306
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 2
  completed_plans: 2
  percent: 90
---

# Project State

## Deferred Items

Items acknowledged and deferred at v3.1 milestone close on 2026-06-24. These are historical open artifacts from already-shipped milestones (verification gaps that were never formally closed) plus one false-positive open flag — none block the v3.1 close:

| Category | Item | Status |
|----------|------|--------|
| verification | phase 21 (v2.1) | human_needed |
| verification | phase 25 (v2.1) | human_needed |
| verification | v3.0-01 (v3.0) | human_needed |
| verification | v3.0-02 (v3.0) | human_needed |
| quick_task | 2-feature-flag-for-scribe | open (false positive — actually completed 2026-03-05) |

Note: the four verification items are pre-existing human-verify gaps inherited from milestones that already shipped; they were acknowledged and deferred at v3.1 milestone close on 2026-06-24. The `2-feature-flag-for-scribe` quick-task is a false-positive open flag (the work was actually completed 2026-03-05) — recorded here for traceability and likewise acknowledged and deferred at v3.1 milestone close on 2026-06-24.

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** L'utilisateur peut interagir avec l'IA de maniere fluide -- actions rapides inline ou chat conversationnel dans un panneau lateral -- pour transformer et manipuler le contenu de son document OnlyOffice.
**Current focus:** Phase 28 — image-reinjection-plugin-only

## Current Position

Phase: 28 (image-reinjection-plugin-only) — Wave 1 DONE, Wave 2 core VERIFIED (build 2026-07-09.6)
Plan: 28-01 COMPLETE ; 28-02 COMPLETE for the core gate (IMG-01..05 + IMG-04 save-fidelity) — see `28-02-SUMMARY.md`
Status: 28-02 core observables + save-fidelity VERIFIED live; residual follow-ups (Q1 floating / Q3 cross-origin / T9 re-run) deferred, non-blocking
Last activity: 2026-07-09 -- save bug (image lost at save) found + root-caused (recalculate=false → setBlipFill history skipped → not transmitted to x2t) + fixed (recalculate=true / Reassign_ImageUrls, commit ba54d6306) via /gsd-debug

### 28-02 — RESOLUTION (2026-07-09)

Core observables and IMG-04 save-fidelity are VERIFIED live (details in `28-02-SUMMARY.md`; save-bug forensics in `.planning/debug/resolved/inject-blip-lost-at-save.md`):
- **IMG-01 single undo** — VERIFIED (Insert + Replace = one undo on a fresh unnamed image; extraction `SetName` wrapped in `History.TurnOff/On`, commit `d2b8782be`).
- **Live render + size** — VERIFIED (blip = `ret.url` prefix-stripped + insert-free warming, commit `18e0fb0f5`; paints at stored extent).
- **IMG-04 save fidelity** — a real bug was found and FIXED: the re-injected image rendered live but was DROPPED at save (degenerate `<pic:blipFill>`, no `<a:blip>`, blank on reopen). Root cause: injection callCommand ran with `recalculate=false` → under `evalCommand===true`, `setBlipFill` skipped its history → blipFill change never transmitted to the co-editing (x2t) server → `Add_NewImage` never fired. Fix: `recalculate=true` when images present (`scribeInjectRecalc`) → `Reassign_ImageUrls` re-applies `setBlipFill` WITH history → x2t writes `<a:blip r:embed>` + new `word/media` part; FromJSON geometry (crop/rotation/extent) preserved. Commit `ba54d6306` (build `2026-07-09.6`), VERIFIED live end-to-end (Insert embeds `rId10`+`image2.png`, renders on reopen; Replace embeds; single-undo intact). The `.3` (keep data-URL) and `.4` (resolve to http URL) fixes were FALSIFIED first — the rasterId FORM was irrelevant, the co-editing TRANSMISSION was the issue.
- **Deferred (non-blocking):** Q1 floating-wrap at save, Q3 cross-origin real-Cozy `getLocalImagePath`, IMG-02 formal no-flicker check, T9 table-cell live re-run.

### 28-02 UAT — first-run DIAGNOSTIC (2026-07-07) — historical, superseded

> **✅ SUPERSEDED / RESOLVED (2026-07-09).** The first-run "text OK but NO image, multiple undos" was subsequently root-caused to bugs in the 28-01 injection itself, not (only) the upstream marker prerequisite theorised below:
> 1. **No image / blank** = a live-render bug: the blip was set to `ret.path` (keeps the `media/` prefix), which `getFullImageSrc2` double-prefixes to `undefined` → image paints BLANK until reload. Fixed by using `ret.url` (prefix-stripped) + insert-free cache warming (LoadImagesWithCallback + CheckRasterImageOnScreen). Commit `18e0fb0f5`.
> 2. **Multiple undos** = the extraction's `SetName("scribe-img-N")` rename landed in its own undo point right before injection. Fixed by wrapping it in `AscCommon.History.TurnOff()/TurnOn()` → a single undo. Commit `d2b8782be`.
>
> The upstream marker analysis below remains a valid prerequisite (the md must carry a `scribe-img-N` marker for capture to run) and is kept for the record, but it was NOT the whole story — the injection had real defects that are now fixed.

Env READY: oo-dev container re-pointed to THIS worktree (cozy-drive-image-reinject) + serving fresh code.js (verified 17 new-symbol hits, 0 old-machinery); no-store + SW patch applied → Ctrl+Shift+R suffices. cozy-stack running; use slug **drive-rb** (same front as this worktree's base scribe-in-right-panel). Dev-mode Test MD button needs `localStorage.SCRIBE_DEV_MD='true'`.

FIRST UAT (Ben): selected a paragraph WITH an image, used dev "Test MD" button (bypasses LLM, re-injects the extracted md). Result: text inserted OK, but NO image, multiple undos, no redo.

DIAGNOSIS (from console `[Scribe]` logs Ben pasted): mode was `insert`; ZERO image-capture logs. `collectReferencedImageNames` runs unconditionally (code.js:578-580) and the capture pre-pass logs as soon as a name is found — so zero logs ⇒ the injected md carried NO `{{IMG:scribe-img-N}}` / `![IMG:scribe-img-N]` marker ⇒ capture pre-pass never ran (empty-names shortcut code.js:2308-2310) ⇒ image never referenced. **This is UPSTREAM of 28-01, NOT an injection bug**: the OLD marker+PasteHtml path had the SAME prerequisite (needs the scribe-img marker in the md). 28-01 only changed injection consumption.

ROOT-CAUSE MECHANISM: "Test MD" sends `inputMd = enrichedMd || htmlToMarkdown(selectedHtml)` (ScribePopover.jsx:137-139). `enrichedMd` = plugin extraction = ONLY source that carries `{{IMG:scribe-img-N}}` markers. If enrichedMd is absent it falls back to turndown → `![](data:…)` with empty alt → buildAndInject drops it (code.js:250 requires alt starting `IMG:scribe-img-`). So no marker → image silently dropped.

PENDING — Ben to report from the Test MD dev panel (3 cols + source badge, already on screen):
  (1) source badge = `plugin` or `turndown`?
  (2) MD-source column at the image location: `{{IMG:scribe-img-N}}` / `![IMG:scribe-img-N]` / `![](data:…)` / nothing?
Branches: `turndown` → plugin extraction returned nothing for the selection (why? sdkjs GetInlineDrawings patch not loaded in browser? extraction gap for this image type?). `plugin` but no marker → extraction dropped the image. Only once we get a marker-bearing md can 28-01's real injection path (and its undo/redo behaviour) be validated.

KEY CODE REFS: injection consume = code.js:964-1017 injectDrawingInto (imageMediaMap 973-974, skip 983-985); capture pre-pass + getLocalImagePath barrier = code.js:2301-2432 (empty shortcut 2308-2310); collectReferencedImageNames = 427-456; IMG: stripped = 250-255 (inline) / 309-313 (block); md→marker conversion = 466; extraction emits = 3245/3265/3330 (`{{IMG:}}` inline), 3433 (`![IMG:]` block). Test MD button = ScribePopover.jsx:137-174; scribeDevMode.js.
NOTE: "multiple undos" — RESOLVED (see the SUPERSEDED banner above): root-caused to the extraction `SetName` rename creating its own undo point; fixed via `History.TurnOff/TurnOn` (commit `d2b8782be`) → single undo. ("no redo" is the separate known OO gotcha `callCommand truncates redo` / redo-disabled-in-coediting — not the plugin.)

### Wave 2 handoff (28-02 — autonomous:false, Ben drives)

28-01 landed on feat/image-reinjection (merge be577bc44); 28-02 then added two live fixes (18e0fb0f5, d2b8782be). code.js now: capture full drawing ToJSON → async getLocalImagePath media pre-pass (ES5 counter barrier, 8s safety timeout) → blip rasterImageId rewrite to **ret.url** (prefix-stripped; ret.path double-prefixed to undefined → blank until reload — corrected in 28-02) → Api.FromJSON + AddDrawing per insertion inside the single injection callCommand, shared cell+¶ via injectDrawingInto(); post-inject the render cache is warmed via LoadImagesWithCallback + CheckRasterImageOnScreen (NOT g_image_loader.LoadImage, whose onload inserts a bogus 50mm image). The extraction's SetName("scribe-img-N") rename is wrapped in AscCommon.History.TurnOff()/TurnOn() so it no longer creates a 2nd undo point → an image Insert/Replace is a SINGLE undo. Removed: marker/PasteHtml machinery (imageSpecFor/addImageMarker/pendingImages/injectPendingImages), drawingIndex/imageCache/Copy() pre-cache, GroupActions undo-group stub. Dormant floating hook: drawingType==="anchor" + FLOATING_FALLBACK=false.
Checks status (2026-07-09): **RESOLVED** — single-undo (History.TurnOff/On); Q4 blip = ret.url; live render+size; **IMG-04 save fidelity** (the forcesave→unzip→`word/media/imageN.png` + `<a:blip>` check) — this was a REAL bug (blip lost at save, `recalculate=false`), now FIXED via `recalculate=true`/`Reassign_ImageUrls` (commit `ba54d6306`, build `.6`); C1 ¶ + Insert regression. **DEFERRED (non-blocking):** Q1 floating (flip dormant FLOATING_FALLBACK if it fails), Q3 cross-origin real-Cozy getLocalImagePath, IMG-02 formal no-flicker, T9 table-cell live re-run. Env: re-point oo-dev to this worktree (`./scripts/oo-dev-setup.sh`, shared container — coordinate); a full oo-dev restart can transiently break OO↔cozy save (callback JWT/session) → re-run the container from this worktree to restore. **jest WORKS here now** (Ben ran `yarn install`; `env NODE_ENV=test npx jest` = 1253 pass / 1 skip / 1 pre-existing ScribeContainer mobile fail; harness config 32/32) — ignore older "jest broken (symlinked node_modules)" notes.

## v3.2 Roadmap Summary

Execution order: v3.2-01 (UX statique) -> v3.2-02 (câblage discussion + sélection) -> v3.2-03 (câblage document complet + stratégie de taille)

| Phase | Goal | Requirements | UI hint |
|-------|------|--------------|---------|
| v3.2-01 Zone « Inclure » discrète (UX statique) | Zone « Inclure » + 3 cases (document/discussion/sélection) au-dessus du prompt, états par défaut, apparition conditionnelle sélection, réutilisation du chip ; aucun câblage LLM | CTX-UX-01..05 | yes |
| v3.2-02 Câblage discussion + sélection | Injection déterministe de la discussion et de la sélection cochées, sans casser le contrat v3.1 | CTX-LLM-02, CTX-LLM-03, CTX-LLM-05 | no |
| v3.2-03 Câblage document complet + stratégie de taille | Nouveau chemin d'extraction document-entier (markdown) + stratégie de troncature documentée + retour utilisateur si tronqué | CTX-LLM-01, CTX-LLM-04 | yes |

## Accumulated Context

### Code anchors (grounding for v3.2)

- **UX (v3.2-01)** : la zone « Inclure » se place dans `src/modules/views/OnlyOffice/Scribe/ChatInput.jsx`, au-dessus du `<textarea>`, là où `SelectionChip` est déjà rendu conditionnellement (`currentSelection &&`). L'état sélection vit dans `ScribeContext` (`currentSelection`, `dismissSelection`). Réutiliser `SelectionChip.jsx` pour la zone d'affichage révélée par la case « sélection ».
- **Câblage discussion/sélection (v3.2-02)** : le point de composition du prompt est `ScribeContext.sendMessage` (assemble le bloc `[Selected text from document]…[End of selected text]` + l'historique via `serializeAssistantTurnForHistory`) et `scribeAI.encodeSelectionForPrompt` / `buildChatSystemPrompt`. La sélection est déjà encodée — le câblage consiste surtout à gater son inclusion par la case. L'historique est déjà sérialisé discussion-seulement.
- **Câblage document complet (v3.2-03)** : ⚠️ il N'EXISTE PAS de chemin d'extraction document-entier. Le plugin `plugins/onlyoffice-scribe/scripts/code.js` n'extrait que la SÉLECTION (via `GetRangeBySelect`), mais possède déjà l'émetteur markdown par-élément (`Api.GetDocument().GetAllParagraphs()` + tables/footnotes, l.627+). CTX-LLM-01 exige un NOUVEAU chemin plugin scannant tout le document en réutilisant cet émetteur — d'où l'isolement de la phase et de la stratégie de taille (CTX-LLM-04). Plugin = ES5 strict (pas d'arrow/const/let).
- **Contrat v3.1 à ne pas casser** : `scribeResponse.js` (parse/validation/repli), `callScribeAIWithReask` (re-ask unique). Les contextes injectés ne doivent jamais fuiter dans `fragments` ni perturber la séparation discussion/fragments. Corpus de régression + sonde (`scribeProbe.js`) doivent rester verts.

### Decisions (v3.2 roadmap)

- 3 phases : UX statique d'abord (contrainte du seed projet « UX FIRST »), puis 2 phases de câblage SÉPARÉES (sources bon-marché in-memory vs document complet)
- Découpage du câblage par coût/risque : v3.2-02 = discussion + sélection (déjà en mémoire, encodage déjà existant) ; v3.2-03 = document complet (nouveau chemin d'extraction plugin + stratégie de taille/troncature) — le risque et la nouveauté technique se concentrent sur le docx, justifiant son isolement
- CTX-UX-05 (discrétion visuelle) traité comme critère de succès de v3.2-01, pas comme phase séparée
- i18n des libellés « Inclure » intégrée à v3.2-01 (5 locales fr/en/de/es/it, zéro chaîne en dur) — cohérent avec la dette i18n fermée en v3.1

### Known Technical Constraints

- Plugin code must use ES5 syntax (no arrow functions, no const/let)
- Endpoint OpenAI-compat non streamé ; pas de modification cozy-stack (frontend only)
- Réponses LLM via cozy-stack POST /ai/v1/chat/completions (format OpenAI)
- Le contrat de réponse v3.1 (`scribeResponse.js`) est figé — toute injection de contexte doit le préserver

## Session Continuity

Last session: 2026-07-08T12:49:49.576Z
Stopped at (most recent): v3.2-03 CONTEXT + UI-SPEC DONE & committés. discuss-phase = 4 axes (troncature, retour tronqué, doc+sélection, fraîcheur ; décision structurante = taille pilotée par config, défaut illimité). ui-phase = UI-SPEC approuvé 6/6 par gsd-ui-checker (notice tronqué inline discrète, réutilisation isLoading/ErrorBubble). Next → `/gsd-plan-phase v3.2-03-cablage-document-complet-strategie-taille`.
Earlier this session: v3.2-02 EXECUTED + VERIFIED passed (10/10). Discussion+selection gates wired at the sendMessage seam (live-read refs, no stale closure), D-05 framing seed added, deterministic 4-quadrant compose spec + v3.1 corpus/PROBE-01 GREEN (160/160 on the 5 gate specs), v3.1 contract frozen artifacts unmodified. Code review found 0 critical / 2 warning (dev-only probe+panel divergence when selection gated OFF) → both fixed (b1b11bb5f). Next step → v3.2-03 (last v3.2 phase; has UI hint).
Resume file: None
⚠️ KNOWN PRE-EXISTING RED (NOT a v3.2-02 regression): `ScribeContainer.spec.jsx › configures Drawer PaperProps for fullscreen on mobile` fails (expects height '100%'; impl uses max-85vh auto-height). ScribeContainer last changed in 55768d1f6/d95e9193d — Phase-16 responsive-drawer drift, predates v3.2-02. Worth fixing in a future polish pass.
📋 UAT DÉCIDÉ — DIFFÉRÉE (décision 2026-06-25, B. + Claude) : pas d'UAT live sur v3.2-02. La CORRECTION (composition déterministe, contrat v3.1 intact, zéro fuite dans fragments) est déjà prouvée automatiquement (160/160, corpus + PROBE-01 verts avec contextes activés) → vérification `passed`, aucun item humain. Seule l'EFFICACITÉ LLM (le modèle exploite-t-il réellement l'historique/la sélection ?) nécessiterait un œil humain — mais le prompt est encore en évolution : le framing D-05 n'est qu'une AMORCE que v3.2-03 retravaille (frame multi-source complet) en ajoutant le bloc document. Tester live maintenant = jeté à v3.2-03. ⇒ UAT LLM-efficacité CONSOLIDÉE après v3.2-03, sur l'état quasi-final du prompt v3.2, couvrant les 3 sources ensemble (sélection + discussion + document). Rien ne ship entre-temps (milestone v3.2 ne ferme qu'à v3.2-03).
✅ RESUME after reboot: run `/gsd-plan-phase v3.2-02-cablage-discussion-selection`. The full slug resolves now that the phase dir exists (verified init.plan-phase phase_found=true on 06-25 after CONTEXT.md write). NO dev env (OO/cozy-stack) needed for planning — it's pure doc generation; the env is only needed later for execute/UAT.
ℹ️ TOOLING NUANCE (refines prior note): gsd-sdk resolves phases by EXISTING directory slug. A brand-new phase whose dir doesn't exist yet returns phase_found=false on the full slug (that's why the first init.plan-phase call this session failed — dir not yet created). Once the dir exists, the full slug works end-to-end. Separately, `roadmap.get-phase` matches the ROADMAP.md heading, so IT needs the abbreviated `v3.2-02`. The abbreviated form's auto `expected_phase_dir` mangles accents (`v3.2-02-c-blage-...`) — irrelevant now since the correct dir already exists. See [[milestone-prefixed-numbering-convention]].
v3.2-02 reads the three include booleans from ScribeContext (l.65-67) at the `sendMessage` prompt-assembly seam (l.164, comment `read by v3.2-02/03; no prompt injection in v3.2-01`). The uncommitted `plugins/onlyoffice-scribe/scripts/code.js` is the selection-cases-harness chantier's dev hooks — leave it; NOT part of v3.2.
Env after reboot: OO container + cozy-stack must be up; Drive `src/` changes need `yarn build` then hard-reload (NOT an OO restart). The uncommitted `plugins/onlyoffice-scribe/scripts/code.js` is the selection-cases-harness chantier's dev hooks — leave it; NOT part of v3.2.
