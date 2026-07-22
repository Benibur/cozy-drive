# Phase 30 — Research

## §1. L'addon fournit-il déjà la géométrie nécessaire ? — OUI

Demande : « une API indiquant la géométrie de la sélection, et poussant des infos lorsque la
sélection change **ou se déplace** à l'écran (scroll, zoom…) ». Audit des sources plutôt que
de la documentation :

| Besoin | Où c'est réalisé | Verdict |
|---|---|---|
| Géométrie de la sélection | `DrawingDocument.GetSelectionScreenRect()` → `{left, top, width, height, corners[4], viewport}` en px fenêtre-éditeur | ✅ |
| Push quand la sélection **change** | `CDocument.private_UpdateSelection` → `NotifySelectionGeometryChanged` (`Document.js:12404`) | ✅ |
| Push quand elle **se déplace** (scroll/zoom) | `DrawingDocument.CheckTargetDraw` (`DrawingDocument.js:2276`), atteint par `OnScroll → UpdateTargetNoAttack → boucle de peinture` | ✅ |
| Anti-spam | déduplication sur la clé géométrique, **viewport inclus** (un resize déplace la zone visible sans bouger la sélection) | ✅ |
| Coût | **0 `callCommand`** ⇒ pile de redo intacte | ✅ |
| Repli si l'éditeur ne sait pas | pas de patch ⇒ pas de rect ⇒ pas d'ancre ⇒ modal centré | ✅ par construction |

Latence mesurée en Phase 29 : **~125 ms** (rythme de la boucle de peinture, pas un debounce
à nous). Invisible tant que le menu était modal (le document n'était pas scrollable) ;
**visible et utile** maintenant que l'overlay est retiré.

**Conclusion : rien à ajouter côté addon.** Ce qui manquait était côté Drive : la conversion
« px éditeur → px viewport » et le test de visibilité étaient **dupliqués** dans le bouton et
dans le menu. D'où le module `scribeSelectionGeometry.js`, qui **est** le contrat : un éditeur
qui veut l'UI ancrée n'a que cette forme à produire.

## §2. Bibliothèque de positionnement — `Popper` (MUI v4), déjà dans l'arbre

Le besoin exprimé (« tenir compte de la place disponible autour de la sélection et de la
taille du menu ») est un problème résolu ; l'enjeu était de ne pas le réécrire.

**Retenu : `cozy-ui/transpiled/react/Popper` = `@material-ui/core/Popper` (v4.12.3) sur
popper.js v1.16.1.** Déjà présent, déjà utilisé dans le repo (`IconColorPicker.jsx`),
**zéro dépendance ajoutée**.

- `flip` (bascule bas↔haut selon la place) + `preventOverflow` (recadrage viewport) =
  exactement la logique demandée, écrite et éprouvée ;
- `arrow` = la flèche de la maquette, **repositionnée** quand le menu est décalé
  latéralement — une flèche épinglée à un coin finirait par ne plus rien pointer ;
- `anchorEl` accepte un **élément virtuel** (`getBoundingClientRect` + `clientWidth/Height`,
  validé dans `Popper.js:252`) ⇒ on lui passe directement le rect de la sélection, sans
  élément DOM fantôme ;
- `popperRef.scheduleUpdate()` ⇒ on lui dit de relire l'ancre quand un rect frais arrive,
  au lieu de recréer l'instance plusieurs fois par seconde pendant un scroll.

**Écarté : `@floating-ui/react`.** API plus moderne (`autoUpdate`, middleware `arrow`), mais
c'est **une dépendance de plus** et deux moteurs de positionnement cohabitant dans la même
application. À reconsidérer seulement si popper v1 nous bloque.

**Écarté : `placement="auto"`** (popper choisit le côté le plus vaste, y compris gauche/droite).
Séduisant sur le papier — c'est littéralement « là où il y a le plus de place » — mais un menu
qui surgit à gauche d'une sélection de texte est déroutant. Retenu : `bottom-start` avec
`flip` limité à `['bottom-start', 'top-start']`, ce qui reproduit la maquette et reste
prévisible.
