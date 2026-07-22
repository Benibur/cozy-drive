---
phase: 30-menu-inline-ancre-selection
plan: 01
subsystem: ui
tags: [scribe, popover, popper, geometry, onlyoffice, anchoring]

# Dependency graph
requires:
  - phase: 29 (bouton Scribe sous la sélection)
    provides: événement poussé `onSelectionGeometryChanged` → intent SELECTION_GEOMETRY {rect, hasText}
provides:
  - Contrat de géométrie de sélection isolé (scribeSelectionGeometry.js) + repli automatique
  - Menu inline ancré à la sélection, non modal, avec flèche (Popper)
  - Ancre virtuelle stable à lecture tardive (le menu suit la sélection au scroll)
affects: [ScribePopover, ScribeContainer, ScribeSelectionButton]

# Tech tracking
tech-stack:
  added: []          # Popper vient de cozy-ui/MUI v4, déjà installé
  patterns:
    - "Élément virtuel Popper alimenté par une ref lue tardivement + scheduleUpdate() sur changement d'ancre"
    - "Contrat éditeur isolé dans un module : son absence PRODUIT le repli, elle ne le déclenche pas"

key-files:
  created:
    - src/modules/views/OnlyOffice/Scribe/scribeSelectionGeometry.js
    - src/modules/views/OnlyOffice/Scribe/scribeSelectionGeometry.spec.js
  modified:
    - src/modules/views/OnlyOffice/Scribe/ScribeContainer.jsx
    - src/modules/views/OnlyOffice/Scribe/ScribePopover.jsx
    - src/modules/views/OnlyOffice/Scribe/ScribeSelectionButton.jsx
    - src/modules/views/OnlyOffice/Scribe/scribe.styl
    - src/modules/views/OnlyOffice/Scribe/ScribeContainer.spec.jsx

key-decisions:
  - "Ancre = la partie VISIBLE de la sélection (intersection avec la zone visible), pas le bouton : hanger le menu au bouton cumulait ses offsets et se lisait « poussé en bas à droite »"
  - "Le bouton se masque pendant que son menu est ouvert (le menu est ancré à la sélection et le couvrirait)"
  - "Largeur du menu FIXE (280) et pilule de prompt qui remplit son hôte : une décision de placement n'est valide que pour la taille avec laquelle elle a été calculée"
  - "Sous-menus basculés à gauche quand la place manque (ils sont absolus : popper ne les voit pas) + ResizeObserver sur le popper (popper v1 n'observe pas sa propre taille)"
  - "Flèche = triangle en bordures + drop-shadow (suit la forme alpha) ; le carré tourné était invisible sur fond blanc"
  - "Aucune modification de l'addon : l'API de géométrie de la Phase 29 satisfait déjà le besoin (audit dans 30-RESEARCH §1)"
  - "Ancre = le disque du bouton sous-sélection (coin de FIN de la sélection), pas le centre de la bbox"
  - "Seule l'étape `menu` est ancrée ; `loading`/`result` restent centrées et modales"
  - "Placement délégué à popper.js (flip + preventOverflow + arrow) plutôt que calculé à la main"
  - "flip limité à bottom-start/top-start : `auto` autoriserait un menu à gauche d'une sélection de texte, déroutant"
  - "Retrait de l'overlay (validé Ben) ⇒ réimplémentation manuelle de clic-dehors / Échap / focus"
---

# Phase 30-01 — Menu inline ancré à la sélection

## Ce qui a été fait

1. **`scribeSelectionGeometry.js` — le contrat.** Conversion px éditeur → px viewport
   (`editorBoxToViewport`), test de visibilité contre le `viewport` poussé
   (`isBoxInEditorView`), coin de fin de sélection (`getSelectionEndCorner`), et
   `createVirtualAnchor` (élément virtuel Popper à lecture tardive). Ce module est le
   **seul** endroit qui sait que l'éditeur vit dans une iframe.

2. **`ScribeSelectionButton`** consomme le module au lieu de sa copie locale de la
   conversion et du clipping, et expose `createSelectionButtonAnchor` +
   l'attribut `data-scribe-selection-button` (exception au clic-dehors : sans elle, un clic
   sur le bouton fermait par clic-dehors puis rouvrait par son propre `onClick`).

3. **`ScribeContainer`** gagne une **troisième branche** : ancrée (Popper + flèche + pas
   d'overlay) quand `anchorEl` est fourni, centrée modale sinon, `Drawer` sur mobile.
   Le retrait du modal impose de refaire à la main ce que `Popover` offrait :
   `ClickAwayListener`, écoute d'Échap, et déclenchement de `onEntered` (qui ne peut plus
   venir d'une transition) pour la passation de focus vers le menu.

4. **`ScribePopover`** construit une ancre **stable** (`useMemo`) au-dessus d'une ref écrite
   au rendu, plus une `anchorKey` qui change quand l'ancre bouge : Popper relit l'ancre au
   lieu d'être détruit/recréé plusieurs fois par seconde pendant un scroll.

5. **Flèche** (`scribe.styl`) : carré tourné à 45°, couleur passée par variable CSS
   (le fichier de style ne peut pas lire le thème MUI, et la flèche doit matcher le papier du
   menu en clair comme en sombre). Sa position le long du bord est écrite par popper ; seul le
   triangle est à nous.

## Vérifié

- `scribeSelectionGeometry.spec.js` : 11 tests (conversion, clipping, coin de fin, lecture
  tardive de l'ancre virtuelle, types numériques exigés par MUI).
- `ScribeContainer.spec.jsx` : 4 tests ajoutés (Popper ancré + modifiers, repli centré,
  mobile inchangé, Échap).
- Suite complète OnlyOffice + cozy-bridge : **355 tests, 21 suites, tout passe**.
- `ScribeContainer.jsx` est désormais **lint-clean** (13 erreurs préexistantes supprimées au
  passage) ; aucun nouvel écart eslint sur les autres fichiers.

## Itération 2 (retours Ben, 2026-07-22)

Trois retours, trois causes distinctes :

1. **Chevron quasi invisible.** Le carré tourné à 45° était un losange blanc sur page blanche,
   séparé d'elle par une ombre à 6 %, son bord extérieur noyé dans l'ombre du menu.
   Remplacé par un **triangle en bordures** + `drop-shadow`, qui suit la **forme alpha** et non
   la boîte : la flèche a un vrai contour sur n'importe quel fond, et aucune couture à la
   jonction avec la carte.

2. **« Toujours en bas à droite, sous le bouton ».** L'ancre était le **disque du bouton** :
   on cumulait l'écart bouton↔texte (4 px), le disque, puis l'écart menu↔ancre — d'où la
   lecture « poussé en bas à droite » au lieu de « accroché à ma sélection ». L'ancre est
   désormais la **sélection elle-même** (`getVisibleSelectionBox`, intersection sélection ×
   zone visible : une sélection haute déborde couramment de la vue, on s'accroche à la partie
   que l'utilisateur voit), et **le bouton se masque** tant que son menu est ouvert.

3. **Positionnement aveugle aux changements de taille.** Trois trous, trois correctifs :
   - la **pilule de prompt** passait de 220 à ~380 px au premier caractère ⇒ le menu
     s'élargissait **après** que sa position eut été calculée, et sortait à droite. La pilule
     n'a qu'un seul hôte (ce menu) : elle **remplit** désormais son hôte, et le menu a une
     **largeur FIXE** (280). Suppression au passage de la machinerie compact/max devenue sans
     objet ;
   - les **sous-menus** sont en `position:absolute` ⇒ ils sortent de la boîte du popper, que
     popper ne voit donc pas grandir. Ils **basculent à gauche** quand la place manque à droite
     (mesure en `useLayoutEffect`, avant peinture, sinon le flyout s'affiche à droite pendant
     une frame puis saute) ;
   - popper.js v1 observe le scroll et le resize de la **fenêtre**, mais **pas la taille de son
     propre popper** (un prompt multi-ligne le fait grandir vers le bas). Ajout d'un
     **`ResizeObserver`** sur l'élément popper → `scheduleUpdate()`. Observer est moins cher —
     et plus honnête — que deviner une hauteur maximale.

## Reste à faire

- **UAT Ben** (voir 30-UAT.md).
- La **refonte visuelle du menu** montrée par la maquette (en-tête « Scribe » + pastille de
  contexte type « CELLULE ») n'est pas dans cette phase → Backlog **999.9**.
