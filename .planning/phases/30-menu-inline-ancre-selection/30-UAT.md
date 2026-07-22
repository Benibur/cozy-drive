# Phase 30 — Points d'UAT

Build Drive rebuildé, plugin inchangé (aucune modification addon dans cette phase).

0. **Chevron** — il doit se voir : contour net sur fond blanc comme en thème sombre.
1. **Position nominale** — sélectionner du texte au milieu de la page, cliquer le bouton :
   le menu s'ouvre **sous** la sélection, flèche en haut, aligné sur le bouton. Pas d'overlay.
2. **Bascule haut/bas** — sélection en **bas** de l'écran : le menu doit basculer **au-dessus**
   (flèche en bas) plutôt que déborder.
3. **Recadrage latéral** — sélection tout à **droite** : le menu se décale pour rester dans la
   fenêtre, **la flèche continue de pointer la sélection** (elle se déplace le long du bord).
4. **Suivi au scroll** — menu ouvert, scroller le document (possible maintenant que l'overlay
   est parti) : le menu suit la sélection (~125 ms de retard, cf. Phase 29).
5. **Sortie de vue** — scroller jusqu'à faire sortir la sélection de la zone visible : le menu
   ne doit pas flotter sur le ruban.
6. **Fermetures** — clic hors du menu ferme ; Échap ferme ; **re-clic sur le bouton** ferme
   (et ne rouvre pas dans la foulée).
7. **Clavier** — le focus arrive bien dans le menu à l'ouverture (flèches ↑/↓, Entrée).
8. **Suite du flux** — choisir une action : `loading` puis `result` s'affichent **centrés avec
   overlay** (inchangé), et Insérer/Remplacer fonctionne.
9. **Panneau ouvert** — bouton visible panneau ouvert, menu ancré par-dessus (acquis du tour
   précédent, à re-vérifier une fois dans ce nouveau rendu).
10. **Thème sombre** — la flèche doit avoir la couleur du papier du menu, sans liseré.

## Ajouts itération 2

11. **Bouton masqué** — le bouton d'ouverture disparaît tant que le menu est ouvert, revient à
    la fermeture.
12. **Largeur constante** — taper dans le prompt ne doit **plus** élargir le menu (donc plus le
    faire sortir à droite).
13. **Sous-menu près du bord droit** — « Traduire » ouvert alors que le menu est collé à droite :
    le flyout doit s'ouvrir **à gauche**, sans clignotement côté droit.
14. **Prompt multi-ligne** — saisir plusieurs lignes : le menu grandit vers le bas et doit se
    **repositionner** (bascule au-dessus si nécessaire) au lieu de sortir par le bas.
