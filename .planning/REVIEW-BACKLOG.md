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
| **T-règles-intra** (T1/T8/T9) | appliquer les règles A (sauts de ligne, espaces, post-sélection) **dans** les cellules | ✅ (live, build .8) | **3 volets** (diagnostic 2026-07-16 session 4). **Volet 1 🔴 corruption CORRIGÉ** (commit `a3585ed96`, build .8) : l'injection multi-¶ intra-cellule aspirait le ¶ top-level après le tableau (Outro) dans la cellule → `cleanupTrailingBlockPara`/`cleanupLeadingSpacer` scannaient `doc.GetElement` (top-level) au lieu du contenu de la cellule → **régression latente depuis build .4** (branche merge A6, T8 jamais rejoué). Fix = scanner `GetParentTableCell().GetContent()`. Vérifié : T8 insert/replace gardent Outro intact ; A6-mid intra-cellule fusionne correctement (`AlpFirst`/`Secondha`) ; A6 top-level byte-identique. **Volet 2 🟠 règles A NON PORTÉES** : la host-detection (l.852) itère `doc.GetElement` (top-level only) → `hostPara`=null intra-cellule → smart-spacing (`AlpFirst` au lieu de `Alp First`), bord→nouveau ¶ (`DeltaAAA` au lieu de `Delta`¶`AAA`), curseur @end retombe à offset 0. **Volet 3 🔧 harnais** : `dumpState.locate()` ne mappe que les ¶ top-level → post-sélection intra-cellule = `block:-1` (aveugle, comme A6-postsel) ; étendre le schéma sélection `{block,cell:{r,c},cellBlock,offset}`. **V3 🔧 FAIT** (`3afc44f27`, build .9) : `dumpState.locate` situe l'intra-cellule → `{block,cell,cellBlock,offset}`. **V2 🟠 FAIT** (`701b8ffc3`, build .12) : `findHostParaAt` cell-aware + strip `\t` terminateur + re-collapse para-relatif gated intra-cellule. Vérifié : @end→`Alpha`¶`XXX`, @mid→`Al XXX pha`, A6-mid→`Al First`¶`Second pha`, replace→`YYY`, Outro intact, post-sél dans la cellule ; top-level A0–A6 inchangé (gate no-op, vérifié sur .9). **T1/T8 RE-CAPTURÉS + BÉNIS Ben** (build .12 : before/after PNG + after.docx forcesave + JSON ; `a7b2f6ba3`). T9 laissé (clone image, hors règles A). **RESTE** : couverture axe A **complète** intra-cellule (A0/A2/A3/A4/A6/A7 + multi-¶ dans une cellule) → nouvelle fixture « cellule-phrase » + extension driver (`T1.C(r,c).P<n>@kind`). | 🟢 V1+V2+V3 FAITS ; T1/T8 bénis ; couverture A-intra à étendre |

## Axe A — goldens de sélection périmés (découvert session 4)

| ID | Constat | Décision | Statut |
|----|---------|----------|--------|
| **A3/insert-golden** | golden top-level inline périmé | ✅ **RÉSOLU (2026-07-17)** : re-capturé `…fox`¶`XXX` (nouveau ¶, règle @end build .2), preuves fraîches, bénis. | ✅ FAIT |
| **A2/A4-postsel-golden** | goldens de **sélection** A2/A4 PÉRIMÉS (build .1) : le vif donne 17/12/0→8. **Pré-existant** (build .2), pas une régression du chantier. | ✅ **RÉSOLU (Ben, option 1, 2026-07-17)** : la post-sél INCLUT l'espace de collage adjacent (A2 ` XXX`, A4 `XXX `), cohérent avec A6. 4 goldens A2/A4 re-capturés (build .12, preuves fraîches) + **bénis** pass. | ✅ FAIT |
| **T-reduc** (T2a/T2b/T2c/T5/T6) | copie de tableau partiel : **supprimer** les lignes/colonnes sans cellule sélectionnée ; factoriser ; gérer fusions (§4bis) | — | chantier dédié (risque + questions fusions) ; challenger §4bis avec tests ; boucle indépendante | 📋 chantier à cadrer |

## Session 2026-07-17 (bis) — le rejeu de masse du corpus (62 goldens, build `.4`/`.5`)

Parti pour bénir l'axe H, découvert que ses 10 bundles n'avaient **aucune preuve** (`screenshotsPending`/`afterDocxPending`) et dataient de 11 builds. La re-capture a fait tomber une régression, puis le rejeu complet a fait tomber le reste.

| ID | Constat | Décision | Statut |
|----|---------|----------|--------|
| **REG-table-insert** | 🔴 **Régression prod** : toute insertion dont la réponse contient un **tableau** détruisait le texte du ¶ suivant (T3 : `Outro paragraph` → `P()` ; H1 : ¶ supprimé). Reproduit sur `table-plain` (sans en-tête ⇒ sans rapport avec §4quater). Cause : la branche de fusion A6 de `cleanupTrailingBlockPara` se gardait sur `blocks[last]` = le ¶ **placeholder** `SCRIBE-TABLE-n` (plain) au lieu de `content[last]` = le **tableau** réel → `appendRunsPreserving` no-op sur un tableau **puis** `RemoveElement` du ¶ hôte. **Même piège que `insSimpleInline` (l.2177) / `isSimpleInline` (l.2233)**, 3ᵉ occurrence. Latente depuis le build `2026-07-16.4` (merge A6) : l'axe tableau n'avait jamais été rejoué depuis. | **CORRIGÉ** (`1a010e2b0`, build `.4`) : garde `lastIsTable`. Vérifié live : T3/insert = golden béni, Outro préservé ; non-rég T3/replace, T2a, T1-intra, **A6 insert+replace byte-identiques aux goldens** ; oracle 32/32. | ✅ FAIT |
| **ORACLE-selection** | 🔴 Le champ `selection {block,offset}` était un **mauvais oracle** : (1) `offset` = unités de position OO, qui comptent les **runs vides** que `blocks` supprime comme du bruit → les 2 champs en désaccord, un golden casse sans que rien ne change à l'écran (sondé : `XXX` après replace = **5 éléments** dont 4 runs vides, span 9 ; le même `XXX` après insert = 1 élément, span 5) ; (2) **illisible ⇒ imbénissable**. | **CORRIGÉ** (`176337889`, build `.5`) : `dumpState` émet `selText` + `selMarkup` (« » en situ) ; les unités de position sortent du modèle (debug, restent dans `capture.json`). 90 `model.json` régénérés (`blocks` byte-identiques, contenu béni préservé). Schéma + specs à jour. | ✅ FAIT |
| **A6/insert post-sél off-by-one** | 🔴 **Bug figé dans 3 goldens BÉNIS**, rendu visible par `selMarkup` : la post-sélection avale **1 caractère du suffixe hôte** — `«Second e»r flows`, miroir intra-cellule `Ac6/insert`, **et `T5/insert`** (`«Tail edit a»ragraph`, découvert au passage). Invisible sous la forme `end:{block:3,offset:10}`. 2ᵉ « correction » de ce bug : le build `.7` l'avait ramené de « toute la queue » à « +1 » et **figé là**. | **CORRIGÉ** (`514821390`, build `.9`). Cause : ancre de fin **arithmétique** (`GetEndPos() - mergedTrailingLen`) en unités de position ; la fin d'un ¶ est **1 unité après son dernier run** (emplacement de la marque ¶) — que l'append remplit ensuite avec le 1ᵉʳ caractère du suffixe ⇒ +1 pile. **Le replace ne tombait juste que parce qu'il traîne un run vide juste avant le suffixe** (sondé : insert `[" " 73..74]["er flows" 75..83]` selEnd=76 ; replace `[" " 29..30][""31..31]["er flows" 32..40]` selEnd=32) — **litière porteuse par accident**. Fix : garder le **run** ajouté par `appendRunsPreserving` et lui demander son range (objet vivant, pas une position : `doc.GetRange(int,int)` ne compose pas à travers une cellule, L#2). Insert et replace **coïncident désormais au caractère près**. | ✅ FAIT |
| **Litière de runs vides** | 🟠 Le chemin **replace** laisse **4 runs vides** autour du texte injecté (`A1/replace` : ¶ `XXX` à 5 éléments) ; le ¶ hôte d'`A1/insert` en traîne 2. Invisible dans `blocks` (`dumpState` les saute) et à l'écran. **Pas purement cosmétique** : un run vide **gras** rend gras ce que l'utilisateur tape ensuite (c'est le « résidu cosmétique = 1 run gras vide » d'A6, ×4). Silencieux depuis le 24/06 (le golden A1/replace `0→5` = span d'un ¶ **propre** à 1 run ⇒ à l'époque le replace ne laissait rien). | investigation dédiée | 📋 à investiguer |
| **T9/insert marqueur image** | 🟠 Rejeu : cellule (0,0) du clone = `![IMG:scribe-img-0]` **en texte littéral** au lieu d'une image. Golden du 28/06 = **antérieur** au merge `feat/image-reinjection` (15/07) qui a refait le chemin d'injection image. Peut être une vraie régression de ce merge **ou** une limite de `/example/` (pas d'hôte Cozy ⇒ pas de relais d'images). **Non tranché.** | investiguer | 🔴 **À INVESTIGUER** |
| **Dette de re-capture** | 📊 Rejeu des 62 goldens : **0 régression** (après fix), **26 identiques**, **31 écarts de sélection seule**, **5 écarts de comportement**. 4 des 5 = le vif applique une **règle bénie** que le golden précède (A8/insert + C1/insert + H3/insert = règle A1/A5 « bord de ¶ → nouveau ¶ » du build `.2` ; T5/insert = règle A6 « le dernier ¶ fusionne le suffixe » du build `.4`). Les 31 = schéma intra-cellule (build `.9`) + espace de collage (règle du 17/07) + 2 goldens sans `selection`. **Cause racine : à chaque règle bénie, seuls les goldens du chantier du jour étaient re-capturés.** C'est cet angle mort qui a masqué REG-table-insert pendant 11 builds. | re-capturer les 36 périmés **en une passe** avec `selMarkup` + `before.png`/`after.png`/`after.docx`, puis blessing Ben | 🔴 **À FAIRE** (après les 2 fix ci-dessus) |

**Note axe H** : les 10 cas H ont une **structure identique aux goldens** sur le build `.4` (seul le champ `selection` diffère) ⇒ l'axe H est **comportementalement correct**, il lui manque les preuves et le blessing. La post-sélection **se rend dans `after.png` sans `grabFocus`** (donc sans vol de focus) → le screenshot est la preuve visuelle qui manquait, `selMarkup` l'oracle machine.

## Hors cas identifiés

| ID | Cible (Ben) | Repro | Décision | Statut |
|----|-------------|:-----:|----------|--------|
| **HIST-img** | fragment d'historique (inline→side-panel) réutilisé : la référence image **n'est pas ré-injectée** (perdue dans l'historique ?) | — | investigation dédiée | 📋 à investiguer |

---

## §4quater (rappel — clos cette session, avant le backlog UAT)
Tables d'en-tête/pied : classification, insert-après-table-haut, mixed-replace → tous corrigés.
Axe H : 10/10 goldens pass (verdicts `pending` à bénir par Ben). Backlog contenu résiduel :
`color` (L#5), `crossref` (L#4).
