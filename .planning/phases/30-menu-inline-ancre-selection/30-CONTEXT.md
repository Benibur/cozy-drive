# Phase 30: Menu Scribe inline ancré à la sélection — Context

**Gathered:** 2026-07-22
**Status:** Implemented (UAT Ben en attente)
**Source:** demande Ben + maquette graphique (`~/Downloads/scribe inline positionning.png`)
**Milestone:** hors milestone (UX du déclencheur inline, suite des Phases 29 / 999.8)
**Branche:** `feat/scribe-in-right-panel` (worktree courant, sert oo-dev)

## Problème

Le menu Scribe inline s'ouvrait **au centre de la fenêtre**, derrière un overlay noir à 50 %,
quelle que soit la position de la sélection. L'utilisateur clique un bouton posé sur sa
sélection et l'UI apparaît à l'autre bout de l'écran, en assombrissant le document
qu'elle est censée transformer.

La maquette demande l'inverse : une carte **posée sur la sélection**, avec une **flèche**
pointant vers elle, **sans overlay**.

## Phase Boundary

**Dans le périmètre :**
- Le **contrat de géométrie de sélection** (ce que l'éditeur doit fournir, et ce qui se passe
  quand il ne fournit rien) — extrait dans un module dédié.
- Le **positionnement** du menu (étape `menu` du popover) + la flèche.
- La **perte du modal** qu'implique l'abandon de l'overlay : clic-dehors, Échap, focus.

**Hors périmètre :**
- Le **contenu** du menu. La maquette montre aussi un en-tête « Scribe » + une pastille de
  contexte (« CELLULE ») et omet la pilule de prompt : c'est une **refonte visuelle du menu**,
  distincte du positionnement demandé. Non traitée ici (cf. Backlog).
- Les étapes `loading` et `result` : grandes surfaces déplaçables, elles restent **centrées et
  modales**. Les épingler à un point près du bas de l'écran ferait combattre le viewport au
  lieu de l'utiliser.
- Le **mobile** : garde son bottom-sheet (`Drawer`). Un menu ancré sur un caret est une idée
  de desktop.

## Décisions

1. **Aucune modification de l'addon.** L'API de géométrie demandée existe déjà (Phase 29) et
   satisfait le besoin — audit en §1 de `30-RESEARCH.md`. Le travail est côté Drive.
2. **Ancre = le disque du bouton sous-sélection**, c'est-à-dire le **coin de FIN** de la
   sélection (déjà éprouvé en UAT), et non le centre de la bbox : sur une sélection
   multi-lignes la bbox est large comme le paragraphe et son centre est loin de là où
   l'utilisateur a relâché la souris.
3. **Le repli n'est pas un cas particulier à retenir** : pas de géométrie ⇒ `anchorEl`
   indéfini ⇒ `ScribeContainer` rend le `Popover` centré d'avant. Ça couvre à la fois un
   éditeur incapable de fournir la géométrie et une sélection scrollée hors vue.
4. **Placement délégué à popper.js** plutôt que calculé à la main (cf. §2 de la recherche).
5. **Overlay retiré** (validé par Ben) ⇒ le document reste lisible ET scrollable sous le menu,
   ce qui rend le suivi à ~125 ms de la Phase 29 réellement utile : le menu suit la sélection
   au scroll.
