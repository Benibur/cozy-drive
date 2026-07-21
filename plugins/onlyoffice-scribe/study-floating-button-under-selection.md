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

### Route A — Patch sdkjs (recommandée, IMPLÉMENTÉE)

⚠️ **CORRECTION vs la 1re rédaction de l'étude** — le canal `executeMethod` / `pluginMethod_` (proposé initialement dans `apiBase_plugins.js`) NE convient PAS au pipeline de patch réel. Vérifié sur le conteneur oo-dev (OO 9.4.0.1) :
- Le dispatch `executeMethod` (`pluginMethod_*`, `apiBase_plugins.js`, `api.js`) est servi par **`sdk-all-min.js`** — le bundle **minifié stock**, que le pipeline Scribe **ne patche PAS** (cf. `oo-dev-setup.sh` L#51-54 : « mount ONLY sdk-all.js ; apiBuilder lives only in sdk-all.js, not sdk-all-min.js »). Un patch dans `apiBase_plugins.js` n'atteindrait donc jamais le navigateur sans recompiler le core minifié (Closure) — ce que le pipeline évite délibérément.
- Le canal **`callCommand` / builder** (`word/apiBuilder.js`) est servi par **`sdk-all.js`** — le bundle concat **non-min**, seul fichier monté/patché (là où vit déjà `GetInlineDrawings`). C'est le SEUL canal qui ride le pipeline prouvé.

→ La méthode est donc exposée côté **builder** (`apiBuilder.js`), appelée par **callCommand**, exactement comme `GetInlineDrawings`.

Flux (implémenté) :
```
[patch] Api.GetSelectionScreenRect()  (word/apiBuilder.js, editor-window px)
   │ callCommand(function(){ return Api.GetSelectionScreenRect(); }, ...)
[plugin code.js]  émet un intent léger SELECTION_GEOMETRY { rect, hasText }
   │ postMessage (broadcastToFrames)
[View.jsx / useCozyBridge]  + offset iframe éditeur (getBoundingClientRect)
   │
[nouveau composant]  portal document.body, position:fixed top/left = rect, z 100000
```

Patch réel (`word/apiBuilder.js`, à côté de `Api.GetDocument` :4623, export :30534) :
```js
Api.GetSelectionScreenRect = function() {
    var oEditor = Asc.editor;                    // real asc_docs_api in editor window (callCommand ctx)
    if (!oEditor || typeof oEditor.asc_GetSelectionBounds !== "function") return null;
    var c = oEditor.asc_GetSelectionBounds();    // stock, word/api.js:14232
    if (!c) return null;
    var xs = [c[0][0],c[1][0],c[2][0],c[3][0]];
    var ys = [c[0][1],c[1][1],c[2][1],c[3][1]];
    var left = Math.min.apply(null,xs), top = Math.min.apply(null,ys);
    var right = Math.max.apply(null,xs), bottom = Math.max.apply(null,ys);
    if (left===0 && top===0 && right===0 && bottom===0) return null; // no selection
    return { left, top, width:right-left, height:bottom-top, corners:c };
};
Api["GetSelectionScreenRect"] = Api.GetSelectionScreenRect;
```
- `Asc.editor` est le vrai `asc_docs_api` : la méthode s'exécute dans la fenêtre éditeur (pas dans le closure sandboxé du plugin), donc `asc_GetSelectionBounds()` est accessible — même mécanique que `GetInlineDrawings`.
- Build : `python3 build/build.py --product word --addon ../sdkjs-forms-94` → `deploy/sdkjs/word/sdk-all.js`, recopié dans `dist/sdkjs-patch-9.4.0.129/sdk-all.js` (monté `:ro` dans oo-dev). Concat pur, pas de Closure. Diff vs dist = uniquement ce patch (43 l.). Livré via l'image OO dérivée (`deploy/integration/image/`) + release asset.
- Ampleur : **PETIT** (1 fichier, ~25 l., additif, réutilise une fonction stock). ✅ Fait + vérifié : bundle+servi contiennent `GetSelectionScreenRect` x2, `GetInlineDrawings` intact x4.

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

> **⚠️ ÉTAT AU 2026-07-21 — l'étude ci-dessous est le document de CADRAGE d'origine.
> Le chantier est LIVRÉ et plusieurs prévisions se sont révélées fausses à
> l'implémentation.** Voir le **§9 « Ce que la réalisation a démenti »** en fin de
> document avant de se fier à un point de cette section.

1. **Repère de coordonnées.** Le rect est en px de la **fenêtre éditeur OO** ; le bouton est rendu dans la **fenêtre Drive** (portal body). Il faut ajouter l'offset de l'iframe éditeur (`getBoundingClientRect`). (Injecter le bouton directement dans le DOM de l'iframe OO est bloqué : origine différente.) → ⚠️ **incomplet, cf. §9.1** : le rect brut n'est PAS en px fenêtre éditeur.
2. **Scroll / zoom = LE vrai point dur.** ✅ **RÉSOLU** (cf. §9.3) — mais pas comme prévu ici : l'événement n'est pas émis « depuis le handler de scroll/zoom du word-control » mais depuis `CheckTargetDraw`, et il a fallu un **second** site d'émission pour la souris.
3. **Throttling iframe background.** Confirmé, et c'était bien un argument décisif : le chemin debouncé arrivait ~1 s en retard. Le push le contourne entièrement.
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

---

## 9. Ce que la réalisation a démenti (2026-07-21, chantier LIVRÉ)

Les §5-§8 ci-dessus sont le cadrage *avant* implémentation. Quatre prévisions étaient
fausses, chacune découverte en **mesurant**, jamais en relisant la source. Le fil rouge :
*la source dit ce que le code veut faire, la mesure dit ce qu'il fait.*

### 9.1 Le rect stock n'est PAS en coordonnées fenêtre éditeur
`asc_GetSelectionBounds` finit sur `ConvertCoordsToCursorWR`, relatif au **conteneur
word-control**. Il manque **deux** offsets, pas un :
- `m_oWordControl.X/Y` (toute la hauteur du ruban) ;
- l'**offset des règles** — piège fin : `…WR(x, y, page, undefined, false)`, ce dernier
  `false` étant `id_ruler_no_use`, fait **sauter** les règles dans `GetMainOffset`, alors
  que la variante globale `ConvertCoordsToCursor3` appelle `GetMainOffset()` **sans
  argument** et les inclut. Ne corriger que le premier laisse une erreur **constante de
  (19, 26) px**.

**Méthode de mesure à réutiliser** : OO place son propre curseur via le même pipeline, donc
`TargetHtmlElement.getBoundingClientRect()` **moins** `{TargetHtmlElementLeft, …Top}`
**EST** l'offset à ajouter. Résiduel après correction : (0.10, −0.46) px = l'arrondi `>> 0`
de OO.

### 9.2 Le canal `pluginMethod_*` était le mauvais — et `word/api.js` aussi
Le §5 et l'annexe proposent `pluginMethod_GetSelectionScreenRect` dans
`common/apiBase_plugins.js`. **Ce fichier n'est pas dans le bundle patché** : il n'existe
que dans `sdk-all-min.js` (stock). Même piège, retombé une seconde fois en déplaçant le
calcul dans `word/api.js`. Le code y était bien présent dans le bundle mais **jamais
chargé**, sans aucune erreur. Sont patchables : `apiBuilder.js`,
`Drawing/DrawingDocument.js`, `Drawing/HtmlPage.js`, `Editor/Document.js`.
Détail + contrôle mécanique : `SDKJS-PATCH.md` §1.

### 9.3 Un seul point d'accroche ne suffit pas
Le §6.2 prévoyait un événement « depuis le handler de scroll/zoom ». En réalité il en faut
**deux**, pour deux causes distinctes :

| Site | Couvre | Sans lui |
|---|---|---|
| `DrawingDocument.CheckTargetDraw` | la sélection **BOUGE** (scroll, zoom) | le bouton reste planté au scroll |
| `CDocument.private_UpdateSelection` | la sélection **CHANGE** (souris, clavier, API) | le bouton **n'apparaît qu'après un scroll** |

⚠️ **Piège de test** : une sélection **programmatique** (`MoveCursorToEndOfLine` +
`UpdateSelection`) passe par `UpdateTarget` → `CheckTargetDraw` et **masque exactement**
le second trou. Pour éprouver la vraie voie souris sans DOM (les événements souris
synthétiques ne pilotent pas OO) : `Selection_SetStart` / `Selection_SetEnd` avec un
`AscCommon.CMouseEventHandler`.

### 9.4 Il fallait aussi la zone visible
Non anticipé : scroller une sélection hors vue **n'arrête pas** la remontée de sa
géométrie — le rect décrit alors une position au-dessus de la barre d'outils, et le bouton
(portal `position: fixed`) n'est clippé par rien. Le patch remonte donc `viewport` dans le
même repère ; Drive n'affiche le bouton que si le **disque tient entièrement** dedans
(masquer plutôt que rogner : un demi-bouton n'est pas cliquable).

### 9.5 Résultat mesuré
Sélection → plugin en **~125 ms** de bout en bout (contre ~1 s par le chemin debouncé),
**0 émission** à l'arrêt (déduplication), suivi correct au scroll et au zoom, et **aucun
`callCommand`** ⇒ pile de redo intacte.

## Annexe — ancres clés
- `word/api.js:14232` / `:15670` — `asc_GetSelectionBounds` (à wrapper)
- `common/apiBase.js:4172` — `getTargetOnBodyCoords` (caret, alternative)
- `word/Drawing/DrawingDocument.js:4339` (mm→px), `:4398` (WR), `:4214` (GetMainOffset), `:4618` (preuve CheckSelectMobile)
- `common/apiBase_plugins.js:1109` — `pluginMethod_GetSelectionType` (patron à copier) ; `common/plugins.js:1682` — résolution `pluginMethod_`
- `common/base-plugin-events.js:49` — `onTargetPositionChanged` (déclencheur, sans payload)
- `word/apiBuilder.js:13338`/`:30935` — style du patch `GetInlineDrawings` existant (canal callCommand, pour contraste)
- React : `ScribeFloatingButton.jsx` (:117 visible, :122/:178 portal, :137 opacity, :25-39 tooltip), `View.jsx:39` (offset iframe éditeur), `cozy-bridge/protocol.js:27-32` (intents)
