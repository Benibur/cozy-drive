# Backlog de revue Scribe — remontées UAT manuelles (Ben)

Suivi des anomalies remontées par Ben lors de tests manuels (session 2026-07-16), avec pour
chaque item : la **cible** (comportement voulu), le statut de **reproduction** dans le harnais,
la **décision** (corriger / documenter / question), et le **statut** d'avancement.

Process (défini par Ben) : analyser la cible + critiquer la cohérence → reproduire → si bug validé,
comprendre pourquoi le test ne le voyait pas → adapter le test (doc → implémentation) pour qu'il
soit NOK → corriger **ou** documenter (si questions fonctionnelles / risque technique) → rejouer
jusqu'au vert.

Statuts repro : ✅ reproduit · ❌ non reproduit · 🔵 hors périmètre harnais · — (question).

---

## Règle d'insertion — CONFIRMÉE (2026-07-16)

Régit A1/A5/A6 (et l'intra-cellule T1/T8/T9). Énoncé validé + illustré :
> Le contenu injecté est collé au **point de collage** (Insertion = fin de sélection ;
> Remplacement = début+fin de sélection, préfixe/suffixe survivent). À **chaque frontière** :
> - frontière **au milieu d'un ¶** → le ¶ injacent (1ᵉʳ à gauche / dernier à droite) **fusionne** ;
> - frontière **à un bord de ¶** (`@start`/`@end`) → le ¶ injacent devient un **nouveau ¶** ;
> - jamais de ¶ vide. Les ¶ injectés du milieu sont toujours des ¶ à part.
> Style du nouveau ¶ = celui du **markdown injecté** (`#`→Titre, `-`→liste, sinon Normal).
> Espacement (`&nbsp;` au milieu, aucun au bord) inchangé. Collage `@start` : non traité (inchangé).

Corollaire extraction : pour que le LLM renvoie le bon style, l'extraction doit transmettre le
style du **1ᵉʳ ¶ partiellement sélectionné** (tend §5bis qui n'émet le marqueur que si ¶ entier).

---

## Axe A — paragraphes

| ID | Cible (Ben) | Repro | Décision | Statut |
|----|-------------|:-----:|----------|--------|
| **A1** insert | nouveau ¶ en dessous (pas de fusion en fin de P1) | ✅ | corrigé (build 2026-07-16.2 ; golden re-capturé) | ✅ FAIT |
| **A2** | — (OK) | — | rien | ✅ |
| **A3** extract | le md démarre à la **sélection**, pas au ¶ | ✅ (UAT souris : sélection @end inclut la marque ¶ \r\n) | corrigé (build .6 : strip \r\n de rangeText avant le clip). TROU HARNAIS: setSelection API ne met pas le \r\n → test de non-reg à ajouter | ✅ FAIT (test à ajouter) |
| **A4** | — (OK) | — | rien | ✅ |
| **A5** insert | 1ᵉʳ ¶ injecté après P3 sur une nouvelle ligne | ✅ | corrigé (même mécanisme qu'A1) | ✅ FAIT |
| **A6** insert+replace | dernier ¶ injecté **fusionné** dans le suffixe (pas de saut final) | ✅ | corrigé (build .4 ; goldens multi-¶ re-capturés, formatage preservé) | ✅ FAIT |
| **A7** ¶ vides de bord | (exigence à relâcher) | ❌ extraction préserve (`\n\nMiddle\n\n`) ; perte = **trim LLM** | 🔵 hors périmètre harnais → relâcher l'exigence + noter la frontière | ⏳ à documenter |
| **A8** select-all | garder le md même avec des tableaux | ✅ (101 ¶ cellules incl. > 100) | corrigé (build .5 : garde sur ¶ top-level + backstop >500) ; validé live fichier Ben. TODO fixture table-heavy + golden | ✅ FAIT (golden à ajouter) |

| **A6-postsel** | post-sélection = **seul l'injecté** (frontières au milieu), pas tout le 1er/dernier ¶ | ✅ (live) | **CORRIGÉ (build 2026-07-16.7)** SANS sentinelle : (1) INSERT dont le 1er para plain fusionne le préfixe (`firstParaMergedInline`) démarre la sélection au point de fusion `preSelStart` — comme le chemin inline A2/A4 ; (2) `mergedTrailingLen` mesure (span de position) le suffixe fusionné dans `cleanupTrailingBlockPara` → la sélection exclut le suffixe hôte. Re-capturé + normalisé (insert block2:8→block3:10, replace block0:10→block1:10) ; goldens A6 **dé-gelés → verdict `pending`**. Non-rég A5 insert/replace = byte-identique. **Choix à bénir (Ben)** : la sélection inclut les espaces de collage aux frontières, par cohérence avec inline A2/A4 (le backlog notait « offset 9 » = exclure l'espace). | 🟡 FAIT — **à bénir par Ben** |

**Leçon blessing (A1/A6-postsel)** : je capture ET je m'auto-blesse (verdict pending + mon analyse) → un golden peut geler un champ BUGGÉ (ici la `selection`) si je scrute le texte mais pas la sélection. → la passe de blessing par Ben est nécessaire (elle attrape ce que « le texte est bon » laisse passer).

**Découverte transverse (A3/A7)** : le harnais **court-circuite le LLM** (fixture déterministe).
Il est donc **aveugle** aux pertes de fidélité **causées par le comportement normal du LLM** (trim des
lignes vides, perte de style) — ce n'est pas de la « qualité LLM » mais un vrai trou. À combler :
soit un test avec vrai appel LLM sur ces cas, soit un post-traitement plugin (ré-imposer les vides
de bord extraits, indépendamment de la réponse).

## Questions transverses (couverture)

| # | Question | Réponse / état | Décision |
|---|----------|----------------|----------|
| Q1 | ¶ avec styles (N1/N2…) : testés ? | cas A* principaux = **plain uniquement** ; stylés à part (`corpus-styled*`, `styled-family`) | 📋 combler après finalisation règles A (matrice {plain × styles}) |
| Q2 | images dans les ¶ : testées ? | oui **C1** (`img-para`, insert+replace) mais **1 seul cas**, pas croisé A1–A8 | 📋 étendre |
| Q3 | sélection multi-¶ + multi-tableaux : testée ? | plus proche = **T6** (2 tables + ¶ milieu) ; pas de cas large | 📋 ajouter |

## Axe T — tableaux

| ID | Cible (Ben) | Repro | Décision | Statut |
|----|-------------|:-----:|----------|--------|
| **T-règles-intra** (T1/T8/T9) | appliquer les règles A (sauts de ligne, espaces, post-sélection) **dans** les cellules | ✅ (live, build .8) | **3 volets** (diagnostic 2026-07-16 session 4). **Volet 1 🔴 corruption CORRIGÉ** (commit `a3585ed96`, build .8) : l'injection multi-¶ intra-cellule aspirait le ¶ top-level après le tableau (Outro) dans la cellule → `cleanupTrailingBlockPara`/`cleanupLeadingSpacer` scannaient `doc.GetElement` (top-level) au lieu du contenu de la cellule → **régression latente depuis build .4** (branche merge A6, T8 jamais rejoué). Fix = scanner `GetParentTableCell().GetContent()`. Vérifié : T8 insert/replace gardent Outro intact ; A6-mid intra-cellule fusionne correctement (`AlpFirst`/`Secondha`) ; A6 top-level byte-identique. **Volet 2 🟠 règles A NON PORTÉES** : la host-detection (l.852) itère `doc.GetElement` (top-level only) → `hostPara`=null intra-cellule → smart-spacing (`AlpFirst` au lieu de `Alp First`), bord→nouveau ¶ (`DeltaAAA` au lieu de `Delta`¶`AAA`), curseur @end retombe à offset 0. **Volet 3 🔧 harnais** : `dumpState.locate()` ne mappe que les ¶ top-level → post-sélection intra-cellule = `block:-1` (aveugle, comme A6-postsel) ; étendre le schéma sélection `{block,cell:{r,c},cellBlock,offset}`. **V3 🔧 FAIT** (`3afc44f27`, build .9) : `dumpState.locate` situe l'intra-cellule → `{block,cell,cellBlock,offset}`. **V2 🟠 FAIT** (`701b8ffc3`, build .12) : `findHostParaAt` cell-aware + strip `\t` terminateur + re-collapse para-relatif gated intra-cellule. Vérifié : @end→`Alpha`¶`XXX`, @mid→`Al XXX pha`, A6-mid→`Al First`¶`Second pha`, replace→`YYY`, Outro intact, post-sél dans la cellule ; top-level A0–A6 inchangé (gate no-op, vérifié sur .9). **RESTE** : re-capturer + bénir T1/T8/T9 (comportement final). | 🟢 V1+V2+V3 FAITS ; goldens à re-capturer+bénir |

## Axe A — goldens de sélection périmés (découvert session 4)

| ID | Constat | Décision | Statut |
|----|---------|----------|--------|
| **A2/A4-postsel-golden** | goldens de **sélection** A2 (`block0:9→15`) et A4 (`4→10`) PÉRIMÉS : le vif donne 17 / 12. **Pré-existant** (vérifié sur code committé .9, AVANT le chantier intra-cellule) — la sélection inline a changé au **build .2** (rework smart-spacing A1/A5) ; goldens datent du build .1 (§5bis). Le TEXTE est bon ; seul `selection` diffère. | Investiguer si 17/12 = correct (inclut l'espace de fin, cohérent A6) ou régression build .2 ; re-capturer + bénir. Orthogonal à l'intra-cellule. | 📋 à investiguer |
| **T-reduc** (T2a/T2b/T2c/T5/T6) | copie de tableau partiel : **supprimer** les lignes/colonnes sans cellule sélectionnée ; factoriser ; gérer fusions (§4bis) | — | chantier dédié (risque + questions fusions) ; challenger §4bis avec tests ; boucle indépendante | 📋 chantier à cadrer |

## Hors cas identifiés

| ID | Cible (Ben) | Repro | Décision | Statut |
|----|-------------|:-----:|----------|--------|
| **HIST-img** | fragment d'historique (inline→side-panel) réutilisé : la référence image **n'est pas ré-injectée** (perdue dans l'historique ?) | — | investigation dédiée | 📋 à investiguer |

---

## §4quater (rappel — clos cette session, avant le backlog UAT)
Tables d'en-tête/pied : classification, insert-après-table-haut, mixed-replace → tous corrigés.
Axe H : 10/10 goldens pass (verdicts `pending` à bénir par Ben). Backlog contenu résiduel :
`color` (L#5), `crossref` (L#4).
