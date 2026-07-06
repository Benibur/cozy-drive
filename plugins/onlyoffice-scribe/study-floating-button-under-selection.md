# Étude — bouton flottant Scribe « sous la sélection »

État : étude de faisabilité (2026-07-06). Aucune implémentation.
Branche : `feat/scribe-assistant-menu` (worktree cozy-drive-scribe-assistant-menu).

## 1. Objectif & contrainte

Ajouter un **2e bouton flottant Scribe**, ancré **sous la sélection de texte courante**, qui :
- n'apparaît **que lorsqu'il y a une sélection non vide** ;
- est **translucide au repos**, **opaque au survol** ;
- affiche un **tooltip** (« ouvrir le menu Scribe » + **raccourci clavier**).

Contrainte : OnlyOffice rend le document dans un **canvas**. Il n'y a pas de DOM de sélection, donc pas de `getBoundingClientRect()` sur la sélection. Hypothèse de départ de Ben : il faut **augmenter l'API OO** pour connaître la position écran de la sélection. → **Confirmé, mais le patch est trivial** (la géométrie est déjà calculée par OO en interne).

## 2. Ce qui existe déjà dans OO 9.4 (stock)

### a. Le rectangle de sélection en pixels écran — DÉJÀ CALCULÉ
`asc_docs_api.prototype.asc_GetSelectionBounds` — `word/api.js:14232` (exporté `:15670`).
- Stock OO (commit 75b53d5, 2026-05-18) — **pas** un patch Scribe.
- Retourne les 4 coins de la sélection **en pixels client de l'éditeur** :
  `[[x0,y0](start-haut-gauche), [x1,y1](start-bas-gauche), [x2,y2](end-haut-droit), [x3,y3](end-bas-droit)]`.
- Gère déjà : rotation/texte-en-forme (matrice `Get_ParentTextTransform`), règle (`GetMainOffset`), RTL, retina.
- Sans sélection / sans doc → `[[0,0],[0,0],[0,0],[0,0]]`.

Chaîne interne (coords document mm → pixels écran) :
- Bornes mm : `LogicDocumentController.js:269` → `DocumentContent.js:8313` → `Paragraph.js:9283` (`{X,Y,W,H,Page}` en mm).
- Conversion mm→px : `DrawingDocument.private_ConvertCoordsToCursor` — `word/Drawing/DrawingDocument.js:4339` ; le **zoom** est plié dans `dKoef`, le **scroll** est déjà intégré dans `drawingPage.left/top`. Wrapper règle : `ConvertCoordsToCursorWR` (`:4398`), offset règle `GetMainOffset` (`:4214`).
- Preuve que c'est bien la géométrie affichée : `DrawingDocument.CheckSelectMobile` (`:4618`) trace le contour visible de la sélection avec **exactement** cette recette.

### b. La position du caret en pixels écran — DÉJÀ CALCULÉE
`baseEditorsApi.getTargetOnBodyCoords()` — `common/apiBase.js:4172`.
- Retourne `{ X, Y, W, H, TargetH, editorX, editorY }` en pixels client (position du caret + hauteur de ligne `TargetH`).
- Alimenté par `DrawingDocument.TargetHtmlElementLeft/Top`, mis à jour à chaque mouvement du caret (`DrawingDocument.js:2225-2226`, `:2543-2544`).
- Déjà consommé par OO pour placer de l'UI **sous le caret** : `ShowInputHelper` (`apiBase_plugins.js:960`, place l'iframe à `Y + TargetH`) et `ShowWindow`/`isTargeted` (`apiBase_plugins.js:2217`).

→ `asc_GetSelectionBounds` = **bbox de la sélection** (idéal pour « sous la sélection »).
→ `getTargetOnBodyCoords` = **caret** (extrémité active ; utile pour curseur collapsé).
Les deux sont sur `asc_docs_api` / `baseEditorsApi`, donc appelables depuis un même wrapper plugin (`this`).

### c. L'événement de déplacement du caret — DÉJÀ ÉMIS (mais sans coords)
`onTargetPositionChanged` — déclaré `common/base-plugin-events.js:49`, émis à chaque déplacement du caret (`text_input.js:434`, `text_input2.js:1279`) **sans payload**. → bon **déclencheur** pour re-interroger la géométrie, mais ne fournit aucune coordonnée.

## 3. Est-ce atteignable depuis un plugin SANS patch ?

**Directement : NON.**
- `getTargetOnBodyCoords()` / `DrawingDocument` vivent sur l'objet éditeur (`Asc.editor`) dans la **fenêtre parente** ; le plugin est dans une iframe (postMessage only).
- `executeMethod` n'expose que la liste blanche `pluginMethod_*` (`common/apiBase_plugins.js`, `word/api_plugins.js`) : **aucune** ne renvoie de rect/point écran (`GetCurrentWord` = texte, pas géométrie ; ni `GetSelectionRect` ni `GetCursorPosition`).
- `callCommand` s'exécute dans la fenêtre éditeur mais **sandboxé** (`common/macros.js:495-534` shadow `window/document/self/Function`) : seul le Builder `Api` (apiBuilder.js) est fourni, et il n'a aucune méthode de rect écran.

**Contournement sans patch (partiel) : OUI — fenêtre OO-native ancrée au caret.**
Le plugin peut ouvrir une `Asc.PluginWindow` avec `variation.isTargeted:true` (ou `ShowInputHelper`) : **c'est OO qui la positionne** sous le caret via `getTargetOnBodyCoords()`. On contrôle le HTML de l'iframe (donc translucidité/hover/tooltip possibles). Limites : ancrée au **caret** (pas à la bbox), placée **au moment de l'appel** (ne suit ni le caret en direct ni le scroll → re-`ShowWindow` requis), et c'est une iframe gérée par OO (plus lourde, moins intégrée au reste de l'UI Scribe).

## 4. Le bouton flottant Scribe actuel (React) — point d'intégration

`src/modules/views/OnlyOffice/Scribe/ScribeFloatingButton.jsx` :
- **React portal sur `document.body`** de la fenêtre **Drive** (`:122`, `:178`), `position:fixed`, ancré **bas-droit** (`bottom:80,right:40`, `:124`), `zIndex:100000` (`:128`). N'est PAS ancré à l'éditeur/sélection.
- C'est une `ScribeFloatingZone` avec 2 boutons (Scribe inline + panneau).
- Visibilité par prop `visible` (`:117`) = `isScribeEnabled && !isPanelOpen` (`View.jsx:73`) — **ne réagit pas à la sélection** aujourd'hui.
- **Style** : JS inline (pas MUI), `opacity:0.4` repos → `1` hover (`:137,:159`), tooltip maison au-dessus du bouton avec libellé i18n + raccourci `Ctrl+Shift+I` (`:25-39,:145-152`).

Pipeline plugin → hôte (cozy-bridge, `src/lib/cozy-bridge/protocol.js:27-32`) :
- `AI_TEXT_ASSISTANT` (round-trip, ouvre le popover inline), `TOGGLE_SCRIBE_PANEL`, `SELECTION_CHANGED` (plugin→hôte, poussé quand le panneau est abonné), `PANEL_ACTION`.
- **Aucune coordonnée ne transite aujourd'hui.** `SELECTION_CHANGED` porte du texte/html/markdown lourd (`code.js:98-113`, `:4130`), poussé **seulement** quand le panneau est ouvert (abonnement `cozy-bridge:selection-subscribe`, `View.jsx:111-116`).
- Multi-iframe : `broadcastToFrames` (`View.jsx:92-108`) car plugin = 2 niveaux sous Drive.

## 5. Les deux routes

### Route A — Patch sdkjs (recommandée)
Exposer la géométrie au canal plugin, la faire remonter à l'hôte Drive, rendre un nouveau bouton portalisé.

Flux :
```
[patch] pluginMethod_GetSelectionScreenRect  (OO editor window px)
   │ executeMethod
[plugin code.js]  émet un intent léger SELECTION_GEOMETRY { rect, hasText }
   │ postMessage (broadcastToFrames)
[View.jsx / useCozyBridge]  + offset iframe éditeur (getBoundingClientRect)
   │
[nouveau composant]  portal document.body, position:fixed top/left = rect, z 100000
```

Patch (calqué sur `GetInlineDrawings`, mais dans `common/apiBase_plugins.js` — canal `executeMethod`, pas `callCommand`) :
```js
// common/apiBase_plugins.js — à côté de pluginMethod_GetSelectionType (:1109)
Api.prototype["pluginMethod_GetSelectionScreenRect"] = function() {
    if (this.editorId !== AscCommon.c_oEditorId.Word) return null;
    var c = this.asc_GetSelectionBounds();      // stock, word/api.js:14232
    if (!c) return null;
    var xs = [c[0][0],c[1][0],c[2][0],c[3][0]];
    var ys = [c[0][1],c[1][1],c[2][1],c[3][1]];
    var left = Math.min.apply(null,xs), top = Math.min.apply(null,ys);
    var right = Math.max.apply(null,xs), bottom = Math.max.apply(null,ys);
    if (left===0 && top===0 && right===0 && bottom===0) return null; // no selection
    return { left:left, top:top, width:right-left, height:bottom-top,
             corners:c };   // garder le quad pour ancrer précisément (fin de sélection)
};
```
- `this` dans `apiBase_plugins.js` **est** `asc_docs_api` → `this.asc_GetSelectionBounds()` direct, zéro nouvelle math.
- Build : même pipeline concat `sdk-all.js` que le patch existant (`dist/sdkjs-patch-9.4.0.129/`), livré via l'image OO dérivée (`deploy/integration/image/`) + release asset.
- Ampleur : **PETIT** (1 fichier, ~15 lignes, additif, réutilise une fonction stock).

Côté plugin (`code.js`) :
- Nouvel intent **léger** `SELECTION_GEOMETRY { rect, hasText }` — NE PAS surcharger `SELECTION_CHANGED` (qui extrait html/markdown/table lourds à chaque sélection : coûteux juste pour bouger un bouton).
- Émis quand : sélection change (init OO déjà branché), `onTargetPositionChanged`, et re-query. Gaté sur Scribe activé, **indépendant de l'ouverture du panneau**.

Côté React :
- Convertir `rect` (repère éditeur OO) → repère Drive : `rect + editorIframe.getBoundingClientRect()` (offset iframe, cf. `View.jsx:39`).
- Nouveau composant calqué sur `ScribeFloatingButton` : portal `document.body`, `position:fixed`, `top/left` = sous la sélection (bas-centre du quad, ou coin `corners[3]`), `zIndex:100000`, `opacity 0.4→1` au hover, tooltip maison (libellé + `Ctrl+Maj+I`).
- Visible ssi `rect` présent **et** `hasText`. Action au clic : `AI_TEXT_ASSISTANT` (menu Scribe sur la sélection).

### Route B — Sans patch (fenêtre OO-native `isTargeted`)
`ShowWindow` avec `variation.isTargeted:true` (ou `ShowInputHelper`) : OO positionne une iframe-plugin sous le caret. Pas de patch, on style l'iframe. Mais : ancrage caret (pas bbox), repositionnement au call-time (re-show sur mouvement), pas de suivi scroll, UI iframe séparée du reste de Scribe. → correct pour un prototype, insuffisant pour un bouton « discret et collé » soigné.

## 6. Points durs / risques

1. **Repère de coordonnées.** Le rect est en px de la **fenêtre éditeur OO** ; le bouton est rendu dans la **fenêtre Drive** (portal body). Il faut ajouter l'offset de l'iframe éditeur (`getBoundingClientRect`). (Injecter le bouton directement dans le DOM de l'iframe OO est bloqué : origine différente.)
2. **Scroll / zoom = LE vrai point dur.** Le rect n'est valide qu'à l'instant de l'appel. `onTargetPositionChanged` couvre le **mouvement du caret**, PAS le **scroll pur** du document. Or le scroll a lieu dans l'iframe OO (cross-origin) → ni le plugin ni Drive ne peuvent l'écouter facilement.
   - MVP : re-query sur `onTargetPositionChanged` + polling ; le bouton peut « traîner » pendant un scroll.
   - Robuste : **étendre le patch** pour émettre un événement plugin `onSelectionGeometryChanged` (avec le rect frais) depuis le handler de scroll/zoom du word-control OO → bouton collé. Patch un peu plus gros mais propre. (agent : un event *uniquement* sur selection-change shipperait des pixels périmés après scroll → il DOIT aussi couvrir scroll/zoom.)
3. **Throttling iframe background.** Le plugin tourne dans une iframe background dont les `setTimeout` sont fortement throttlés (piège connu du projet) → un polling côté plugin est peu fiable. Argument de plus pour la variante push (event) côté patch.
4. **Sélection multi-lignes / multi-pages.** Les coins sont *début-1re-ligne* et *fin-dernière-ligne* → parallélogramme, la bbox min/max paraît trop large. Pour ancrer un bouton, préférer le **coin de fin** (`corners[3]`) ou le bas-centre plutôt que la bbox brute.
5. **Curseur collapsé / image sélectionnée.** Collapsé : rect fin (le bouton ne s'affiche de toute façon que si `hasText`). Image : `asc_GetSelectionBounds` est **texte seulement** → gérer via `GetSelectionType()==="drawing"` + `getSelectedObjectsBounds()` si un jour on veut ancrer sur image.

## 7. UX (rappel des exigences → mapping)
- Apparaît si sélection non vide → gate `hasText && rect`.
- Sous la sélection → `top = rect.bottom (+petit gap)`, `left = centre horizontal du quad` (ou coin de fin).
- Translucide/opaque au hover → pattern existant `opacity 0.4→1` (`ScribeFloatingButton.jsx:137`).
- Tooltip + raccourci → tooltip maison existant, texte i18n « Ouvrir le menu Scribe (Ctrl+Maj+I) ».
- Discret → petit bouton icône seule (SparkleIcon), sans le libellé.

## 8. Recommandation & plan par étapes

**Recommandation : Route A**, en 2 incréments.
- Ben livre déjà une image OO dérivée avec un patch sdkjs (`GetInlineDrawings`) → le pipeline de patch est en place, le coût marginal est faible.
- Le patch réutilise une fonction **stock et prouvée** (`asc_GetSelectionBounds`) → risque quasi nul.

Étapes :
1. **Patch pull** `pluginMethod_GetSelectionScreenRect` (~15 l.) + rebuild `sdk-all.js` + mount oo-dev. Test : `executeMethod("GetSelectionScreenRect")` renvoie un rect cohérent avec la sélection visible.
2. **Plugin** : intent léger `SELECTION_GEOMETRY {rect,hasText}` émis sur selection-change + `onTargetPositionChanged`, indépendant du panneau.
3. **React** : conversion repère + nouveau composant bouton (portal, fixed, hover, tooltip). Câbler clic → `AI_TEXT_ASSISTANT`.
4. **Scroll-glue** (incrément 2, si le MVP « traîne » trop) : patch event `onSelectionGeometryChanged` sur scroll/zoom du word-control → push du rect frais.

Décision produit (tranchée 2026-07-06) : **le clic ouvre directement le popover inline** (`AI_TEXT_ASSISTANT`) sur la sélection — pas de mini-menu. Corollaire : l'ancien bouton flottant bas-droite (`ScribeFloatingButton`) perd sa raison d'être pour l'inline ; on prévoit de **retirer** sa fonction inline (le nouveau bouton sous-sélection la remplace). Le panneau latéral reste accessible par ailleurs.

## Annexe — ancres clés
- `word/api.js:14232` / `:15670` — `asc_GetSelectionBounds` (à wrapper)
- `common/apiBase.js:4172` — `getTargetOnBodyCoords` (caret, alternative)
- `word/Drawing/DrawingDocument.js:4339` (mm→px), `:4398` (WR), `:4214` (GetMainOffset), `:4618` (preuve CheckSelectMobile)
- `common/apiBase_plugins.js:1109` — `pluginMethod_GetSelectionType` (patron à copier) ; `common/plugins.js:1682` — résolution `pluginMethod_`
- `common/base-plugin-events.js:49` — `onTargetPositionChanged` (déclencheur, sans payload)
- `word/apiBuilder.js:13338`/`:30935` — style du patch `GetInlineDrawings` existant (canal callCommand, pour contraste)
- React : `ScribeFloatingButton.jsx` (:117 visible, :122/:178 portal, :137 opacity, :25-39 tooltip), `View.jsx:39` (offset iframe éditeur), `cozy-bridge/protocol.js:27-32` (intents)
