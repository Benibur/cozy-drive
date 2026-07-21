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
| **Litière de runs vides** | 🟠 Le chemin **replace** laisse **4 runs vides** autour du texte injecté (`A1/replace` : ¶ `XXX` à 5 éléments) ; le ¶ hôte d'`A1/insert` en traîne 2. Invisible dans `blocks` (`dumpState` les saute) et à l'écran. Silencieux depuis le 24/06 (le golden A1/replace `0→5` = span d'un ¶ **propre** à 1 run ⇒ à l'époque le replace ne laissait rien). ⚠️ **L'hypothèse « pas purement cosmétique » (un run vide gras rendrait gras ce que l'utilisateur tape ensuite) est INFIRMÉE — voir § Session 2026-07-21.** | **investigation FAITE 2026-07-21** : contagion non reproductible ⇒ **cosmétique / bruit structurel**, pas un bug utilisateur | 🟢 **CLOS — reclassé cosmétique** |
| **T9/insert marqueur image** | ✅ **AUCUNE RÉGRESSION — c'était mon rejeu.** Vérifié live sur doc frais (build `.9`) : extraction → `[CELL:0,0]![IMG:scribe-img-0](placeholder)[/CELL]` ; injection du marqueur **réellement émis** → original `scribe-img-0` intact **ET clone (0,0) = image `scribe-img-1` ré-injectée**. **2 pièges de harnais** (à ne pas refaire) : (1) l'extraction **RENOMME** l'image à chaque passage (`scribe-img-4`→`scribe-img-5`) et **le renommage SURVIT à l'undo** (hors historique) ⇒ un `md` qui code `scribe-img-0` en dur ne matche plus rien → résolveur muet → pas d'image. **Même famille que le piège `[CELL:r,c]`** : la fixture doit utiliser ce que l'extraction **reporte**, jamais un index remis à 0. En prod le LLM renvoie le marqueur tel qu'extrait ⇒ jamais de dérive. (2) `![IMG:scribe-img-0]` **nu n'est pas** de l'image markdown (pas de `(…)`) → ressort en texte littéral ; l'extraction émet toujours `![IMG:...](placeholder)`. | golden T9/insert = **fixture md irréaliste** (marqueur nu, jamais produit par l'extraction) → à re-capturer avec le marqueur réel | ✅ **CLOS** (re-capture avec les 36) |
| **Goldens aveugles aux images** | 🟠 `dumpState` **ne capture pas les images** ⇒ un `model.json` **ne peut pas** distinguer « cellule vide » de « cellule avec image ». Les goldens image (T9, C1) ne prouvent donc **rien** sur l'image ; la preuve de l'époque venait d'`after.docx` (`a:blip=2`). **Même angle mort que le champ `selection`** : le modèle tait ce qu'il ne sait pas voir, et le golden gèle ce silence. | vérifier l'image via l'API drawing (`GetAllDrawingObjects().GetName()`) ou `after.docx`, **jamais** via `model.json` ; envisager d'ajouter le nom des drawings au modèle | 📋 à cadrer |
| **Dette de re-capture** | 📊 Rejeu des 62 goldens (build `.4`) : **0 régression** (après fix), **26 identiques**, **31 écarts de sélection seule**, **5 écarts de comportement**. 4 des 5 = le vif applique une **règle bénie** que le golden précède (A8/insert + C1/insert + H3/insert = règle A1/A5 « bord de ¶ → nouveau ¶ », build `.2` ; T5/insert = règle A6 « le dernier ¶ fusionne le suffixe », build `.4`). Les 31 = schéma intra-cellule (build `.9`) + espace de collage (règle du 17/07) + 2 goldens sans `selection`. **Cause racine : à chaque règle bénie, seuls les goldens du chantier du jour étaient re-capturés** ⇒ aucun axe n'est rejoué quand un autre bouge. C'est cet angle mort qui a masqué REG-table-insert pendant 11 builds (3ᵉ occurrence : cf T8/V1, A3). | ⚠️ **PÉRIMÈTRE CORRIGÉ : c'est 62, pas 36.** Depuis la refonte de l'oracle (`176337889`), **les 62 `model.json` ont `selText:null` + `selMarkup:[]`** (vérifié : 0/62 peuplés) — les captures sont antérieures au champ. Donc **tout le corpus doit repasser à la capture** pour acquérir l'oracle de sélection ; les « 36 périmés » sont juste ceux qui bougent AUSSI sur d'autres champs. Une passe, tout le corpus, preuves complètes : `capture.json` + `model.json` + `before.png` + `after.png` + `after.docx`. Puis blessing Ben sur `selMarkup` (lisible) et non sur des offsets. | 🔴 **À FAIRE — prochaine grosse tâche** |

**Note axe H** : les 10 cas H ont une **structure identique aux goldens** sur le build `.4` (seul le champ `selection` diffère) ⇒ l'axe H est **comportementalement correct**, il lui manque les preuves et le blessing. La post-sélection **se rend dans `after.png` sans `grabFocus`** (donc sans vol de focus) → le screenshot est la preuve visuelle qui manquait, `selMarkup` l'oracle machine.

## Session 2026-07-17 (quater) — passe de blessing Ben sur les 62 (console) : 52 OK / 10 KO

Ben a fait le défilé dans la console de blessing. Triage des 10 KO (⚠️ tous ne sont PAS des verdicts à
basculer — 2 questions, 2 fixtures dégénérées, 1 artefact de screenshot, 2 vrais bugs de sélection).

| Cas KO | Nature | Constat | Action |
|--------|--------|---------|--------|
| **T1/insert, T1/replace** | ❓ question | « quelle différence avec A1 ? » | Réponse : même règle (bord de ¶ → nouveau ¶ / replace intra-¶) mais **DANS une cellule** vs A1 top-level. Le chantier T-intra (V1/V2/V3) a montré que ce n'est pas gratuit (host-detection était top-level-only). Pas redondant, pas un bug → **rester OK**. |
| **A2/replace, Ac2/replace** | 🔧 fixture dégénérée | sélection `@mid..@mid` = **curseur vide** → en replace il n'y a rien à supprimer ⇒ se comporte comme insert ⇒ le cas **ne démontre pas le replace**. | Le matrix a déjà des replace-sur-texte (A1/replace tout le ¶, A3/replace partiel). **Ajouter/adapter une fixture replace-sur-mot** (before avec ≥1 mot sélectionné). Amélioration de couverture, **pas un verdict KO du golden**. |
| **A8/insert** | 🖼️ artefact screenshot | « il manque la sélection dans le after » | La sélection **EST** dans l'oracle (`selMarkup «A8 tail line»` au ¶120, le ¶ ajouté) ; mais `after.png` cadre le HAUT du doc (120 ¶) et le ¶ ajouté est tout en bas, **hors cadrage**. Pas un bug Scribe. **Amélioration harnais** : re-screenshotter A8 scrollé en bas. → rester OK. |
| **T3/insert, T9/insert, H-reg/insert** (+ **H1/insert**, même défaut, passé OK par erreur) | 🔴 **VRAI BUG sélection** | **Insert d'un clone de tableau ENTIER → la post-sélection couvre N−1 des N cellules, OMET la DERNIÈRE** (T3 : `«w»«x»«y»` sans z ; T9 : image + `«BetaI»«GammaI»` sans DeltaI ; H-reg/H1 : `«w»«x»«y»` sans z). Cohérent (toujours la dernière) ⇒ **une seule cause**. Cible = la sélection couvre TOUT le tableau inséré. | **CORRIGÉ (`5348469ab`, build `2026-07-19.4`)**. Cause (sondée LIVE, ~6 tours) : selectByRefs pose la post-sél DANS le callCommand d'injection, juste après `InsertContent` — à ce moment les **positions du tableau fraîchement inséré ne sont PAS recalculées** ⇒ `doc.GetRange(début,fin)` sur les cellules d'angle (et l'`ExpandTo` d'objets range) s'arrête **1 cellule trop court**, même avec des positions de cellule déjà correctes ; le MÊME `doc.GetRange` couvre tout dans un callCommand **ultérieur** (settled). Le chemin Replace n'est pas touché (il remplace un tableau **existant** à positions stables). **Fix** : drapeau `__fullTableInsert` → re-sélection **différée** dans un callCommand suivant (`reselectFullTableAfterInsert`) une fois le doc recalculé ; tableau retrouvé **ELEMENT-based** (`¶ → GetParentTableCell → GetParentTable`), PAS par match de positions sur `GetAllTables` (les tables d'en-tête/pied collisionnent en position, §4quater → sur-sélectionnait original+clone sur H1). **Gate** : content finissant par un tableau (mixte texte+tableau T4 épargné) + sélection démarrant DANS ce tableau. Vérifié LIVE `.4` : T3/T9/H1/H-reg = 4 cellules ; non-rég T4/T3-replace/T2a/H2/H3/T8/T2b/T2c. ⚠️ **piège capture** : la re-sél étant différée, `captureAfter` doit attendre **2500 ms** (sinon capture l'état intermédiaire à N−1). **4 goldens re-capturés** (build `.4`, blocks byte-identiques, selMarkup complet). | ✅ **FAIT** |
| **T2b/insert, T2c/insert** | 🔴 **VRAI BUG + T-reduc** | Deux problèmes, tableaux **fusionnés** : (a) la post-sélection porte sur les **MAUVAISES cellules** (T2b édite la ligne 3 `Hi/Hj` mais la sél. couvre le HAUT `H00..B2` ; T2c édite les lignes 1-2 `Va..Ve`, sél. sur le haut) ; (b) le clone reprend **TOUT** le tableau au lieu de se réduire aux lignes/cols sélectionnées. **(b) = chantier T-reduc DÉJÀ au backlog**, compliqué par les fusions (§4bis clone entier EXPRÈS : `RemoveRow/Col` corrompt les spans). **Contrôle** : T2a (NON-fusionné) **réduit bien** (clone 1×2, sél. `«AA»«BB»` correcte) ⇒ le souci de réduction est **spécifique aux fusions**. | (a) bug sélection à corriger ; (b) chantier T-reduc à cadrer (risque spans). **NE PAS bénir pass.** |

**Récapitulatif verdicts** : 52 OK confirmés (dont beaucoup déjà `pass`). **Bug ④ full-table-insert CORRIGÉ (`5348469ab`, build `.4`) + 4 goldens re-capturés** (T3/T9/H1/H-reg insert = sélection complète) → axe H **redevient bénissable**. **RESTE à traiter** : **T2b/insert, T2c/insert** (bug ⑤ merged : sél. sur mauvaises cellules + non-réduction = chantier T-reduc, inchangés par le fix ④). **2 fixtures à améliorer** (A2/replace, Ac2/replace = sélection vide en replace). **1 amélioration harnais** (A8/insert : screenshot scrollé). **2 questions** répondues (T1 = même règle qu'A1 mais intra-cellule).

**Bugs de sélection** :
1. ✅ **full-table clone insert : post-sél omet la dernière cellule** (T3/T9/H-reg/H1 insert) — **CORRIGÉ** (`5348469ab`, build `.4`, re-sélection différée element-based). 4 goldens re-capturés.
2. ✅ **partial-merged clone insert : post-sél sur les mauvaises cellules** (T2b/T2c) — **CORRIGÉ (`8c3815b30`, build `2026-07-20.1`)**. La post-sél de l'insert partiel vient de `selectByRefs` (sélectionnait tout le clone), PAS de `reselectFullTableAfterInsert`. Band-aid (a), clone laissé COMPLET : la branche merged-partial-insert retourne `selectedCellCoords` (les écritures `Asc.scope` dans un callCommand ne propagent pas à un callCommand frère → il faut RETOURNER la valeur puis la republier plugin-side), le callback republie sur `Asc.scope.__partialInsertCells` et `reselectFullTableAfterInsert` sélectionne le rectangle min/max r,c des cellules éditées via `ExpandTo` (element-based, span-safe). Vérifié LIVE : T2b `«Hi»«Hj»`, T2c `«Va»«Vb»«Vc»,∅,«Vd»«Ve»`. Non-rég LIVE : T2b/T2c replace, T2a insert, T3/H1 insert. 2 goldens re-capturés et **BÉNIS Ben le 2026-07-20** (verdict `pass`). **RESTE ⑤(b)** : non-réduction du clone fusionné (T-reduc) = chantier délicat séparé (risque spans §4bis), non traité.

### → Câblé dans le workflow gsd (2026-07-20)

Le reste-à-faire de la passe de blessing est désormais **suivi comme entrées de backlog** dans `.planning/ROADMAP.md` (§ Backlog), promouvables via `/gsd-review-backlog` :
- **Phase 999.2** — bug ⑤ (T2b/T2c) : post-sélection sur mauvaises cellules **+** non-réduction du clone fusionné (chantier T-reduc). Ce document reste la **source de vérité du détail** (diagnostic, contrôle T2a).
- **Phase 999.3** — dette de couverture harnais : fixtures A2/Ac2 replace-sur-mot **+** re-screenshot A8/insert scrollé.
- **Phase 999.4** *(ajoutée 2026-07-21)* — **images référençables depuis le contexte document** (référence positionnelle `doc-img-N` + empreinte) : conception validée et vérifiée live, **implémentation bloquée** sur la numérotation des rangs ; inclut l'item annexe « le prompt ne dit rien des marqueurs image ». Détail : `.planning/SNAPSHOTS-CADRAGE.md` §10.
- **Phase 999.5** *(ajoutée 2026-07-21)* — **snapshots : rattacher au message + lever la collision de numérotation** (+ `castEmptySelection` qui oublie `lastTableDocIndices`). Détail : `.planning/SNAPSHOTS-CADRAGE.md` §2-§9.

Reste hors-gsd (à bénir par Ben, artefact déjà à jour) : **re-bénir T3/T9/H1/H-reg insert** (sélection corrigée par le fix ④ `5348469ab`) dans la console de blessing (`gen_blessing.py`).

### Session 2026-07-20 — Phase 999.3 EXÉCUTÉE (dette harnais comblée)

Les deux items de la Phase 999.3 sont **faits** (aucun `code.js` touché — build inchangé `2026-07-19.4`, `verify-bundles` **66/66**, oracle jest **39/39**) :

| Item | Action | Statut |
|------|--------|--------|
| **Fixtures dégénérées A2/replace + Ac2/replace** | 2 nouveaux cas **`A2w`** (top-level, `P1@10..P1@15`, fixture a-family) + **`Ac2w`** (intra-cellule, `T1.C(0,0)@10..T1.C(0,0)@15`, fixture table-arules) : sélectionnent un **mot entier intérieur** (« brown », offsets 10..15 de « The quick brown fox ») borné des DEUX côtés. Grammaire d'offsets numériques **déjà supportée** par `parseSelSpec` ⇒ 0 changement `code.js`. 4 goldens capturés (insert+replace × 2), preuves complètes. **Replace vérifié** : « brown » réellement supprimé → « The quick XXX fox » (préfixe/suffixe survivent, pas de double espace) — vs A2/replace dégénéré « The quick XXX brown fox » (curseur vide = se comporte comme insert). Ajoutés à `cases.csv` (matrice régénérée) + manifeste reproductible `test-harness/tools/word-replace-cases.json`. **verdict `pending`** (à bénir par Ben). | ✅ **FAIT** |
| **Artefact screenshot A8/insert** | `after.png` **re-capturé scrollé en bas** (canvas OO → `m_oScrollVerApi.scrollToY(max)`) : la post-sélection `«A8 tail line»` (¶120, tout en bas) est désormais **dans le cadrage**, surlignée sous « Para 120 ». `capture.json`/`model.json` **inchangés** (l'oracle `selMarkup` était déjà correct — c'était un pur artefact de cadrage, pas un bug Scribe). meta.json annoté. | ✅ **FAIT** |

**Béni par Ben le 2026-07-20** (console `gen_blessing.py`) : les 4 nouveaux goldens `A2w`/`Ac2w` (insert+replace) → verdict **`pass`** (blocks + selMarkup). A8/insert after.png revérifié OK. Ces cas **remplacent démonstrativement** A2/replace + Ac2/replace dégénérés (qui restent au corpus comme cas « curseur collapsed », légitimes et déjà bénis). **Phase 999.3 close.** Reste au corpus 10 `pending` = **axe H** (chantier distinct, non lié à 999.3).

### ⚠️ Snapshots — 2 failles CADRÉES (2026-07-21), non corrigées

Deux questions de Ben pendant la prépa d'UAT ont mis au jour deux failles du correctif `79a720a8e` :
- **(A) snapshots dans un `ref`, pas dans le message** (`View.jsx:81/173`) → réutiliser un fragment
  **remonté du fil** prend les snapshots d'une extraction **postérieure** ⇒ au mieux repli à plat, au
  pire **mauvais tableau réinjecté sans signal**. Équivalent tableaux de **HIST-img**.
- **(B) collision de numérotation** : extraction **sélection** (`[TABLE:N]` = N-ième table *touchée
  par la sélection*) vs extraction **document** (N-ième table *du corps*) — et le prompt supporte
  **les deux ensemble** (`scribeAI.js:142`) ⇒ deux tableaux différents peuvent être `[TABLE:0]` dans
  le même prompt. Ma règle `snapshotsForFragment` aggrave en préférant **aveuglément** la sélection.

**Cadrage complet** : `.planning/SNAPSHOTS-CADRAGE.md` (contraintes dures — contrat v3.1 + son corpus,
plafond 1 Mo, mémoire ; décisions D1 *où vivent les snapshots* / D2 *lever la collision* / D3
*rétention* ; garde-fou transversal ; stratégie de test ; recommandation).
**Décision Ben** : « traiter le fond, pas le symptôme » ⇒ **à promouvoir en phase gsd**, ne pas
bricoler inline. Recommandation : poser d'abord le **garde-fou de cohérence snapshot ↔ marqueur**
(convertit « mauvais tableau silencieux » en « tableau à plat honnête »), puis D1=(b) table par
`contextId` + D2=(S-1) renumérotation unique à la composition (**grammaire des marqueurs intacte**).

**Consignes UAT en attendant** : ne pas cocher « document » **et** « sélection » ensemble ; insérer
depuis la **dernière** réponse, pas depuis un fragment remonté du fil. Un tableau **inattendu** (ni
absent, ni à plat) pendant l'UAT = très probablement ces failles, pas le correctif principal.

### Chantier RESSOURCES D'UN FRAGMENT — état, décisions et mode d'emploi (2026-07-21)

**Principe directeur (décision Ben)** : pour réinjecter une ressource référencée par un fragment,
**une COPIE sérialisée vaut mieux qu'une RÉFÉRENCE**. Motif : une référence peut pointer vers une
ressource **modifiée depuis** la question — réinjecter « ce qui est là maintenant » au lieu de « ce
dont on parlait » est **pire** qu'une perte (silencieux et faux). La copie fige l'état au moment de
l'extraction.

#### Tableaux — ✅ FAIT (copie sérialisée), `79a720a8e`
`table.ToJSON(true, true)` est une opération de **LECTURE** ⇒ compatible avec la contrainte « le
contexte ne mute pas le document » (celle qui interdit `SetName`), et **préserve les fusions**.
Câblage : extraction document → `docTableSnapshots[tableIndex]` → réponse
`cozy-bridge:document-extracted` → `docTableSnapshotsRef` (hôte) → `snapshotsForFragment(text)` au
clic, **filtré aux seuls `[TABLE:N]` du fragment** (canal retour plafonné à **1 Mo**,
`validateIntent`). Résultat live : clone **strictement identique** à l'original.

#### Images — ⏸️ ON RESTE SUR LES RÉFÉRENCES (décision Ben 2026-07-21)
La copie n'est **pas** transposable en l'état. Deux obstacles **durs**, mesurés :
1. **`drawing.ToJSON()` perd le bitmap** — documenté phase 23.1 : « *ToJSON preserves dimensions but
   **loses the bitmap data** — images appear as white rectangles* ». Seul `Copy()` préserve le
   contenu, et c'est un objet **en mémoire**, non sérialisable à travers `postMessage`.
2. **Plafond de 1 Mo sur le canal retour** (`PANEL_ACTION` est un `cozy-bridge:intent`,
   `MAX_DATA_SIZE = 1_000_000` dans `src/lib/cozy-bridge/protocol.js:35`). Le canal d'extraction
   (`cozy-bridge:extract-document`) contourne délibérément cette limite, **mais pas le retour**.
   Une photo en base64 le dépasse couramment.

**État livré** (`a6f65d550`) : pas de handle fictif en mode document (token `[image]`) + filet de
sécurité (paragraphe `[image]` visible si un marqueur ne résout pas). Le flux **sélection** garde ses
**vraies** références (`SetName` → `scribe-img-N`) et réinjecte pour de bon.

**MODE D'EMPLOI si on reprend le sujet** (ordre recommandé) :
1. **Mesurer d'abord** la distribution de taille des images des documents réels — si la majorité
   passe sous ~700 Ko en base64, la copie devient viable pour le cas courant.
2. **Copie avec garde-fou de taille** : sérialiser `{géométrie (ToJSON), bytes base64}` à
   l'extraction de contexte ; au-delà du seuil → ne pas embarquer, retomber sur le placeholder
   visible actuel. Ne JAMAIS dépasser le plafond : le message serait rejeté **en silence** par
   `validateIntent`.
3. **Réinjection** : réutiliser le pipeline image existant (pré-passe `getLocalImagePath` →
   `imageMediaMap {json, rasterId}` → `FromJSON`+`AddDrawing` en **un seul** callCommand), en le
   semant depuis les octets transportés au lieu du nom. ⚠️ Le `rasterId` est **une ressource de
   session** du serveur documentaire, pas un identifiant portable — il doit être **re-créé** côté
   injection, jamais transporté.
4. **Ne pas** activer `SetName` en mode document pour « faire marcher les références » : c'est une
   **mutation** du document pendant une extraction de contexte (pollution de l'historique d'undo et
   de la co-édition). C'est la contrainte qui a créé tout ce bug au départ.
5. **Prouver au SAVE**, pas seulement au live : `after.docx` doit contenir `<a:blip>` **et** une
   partie `word/media/` (angle mort connu : `model.json` ne voit pas les images).

#### ❓ Question OUVERTE — écart non expliqué sur les tableaux markdown non carrés
Ben rapporte avoir vu, **dans le document**, un tableau markdown **3×4** correctement injecté avant
le fix. Mes mesures disent l'inverse : bug remis temporairement + **vrai** HTML converti (donc repli
`PasteHtml` inclus) + code servi vérifié → **rien** ne s'insère (ni tableau ni texte) ; arguments
inversés → insertion correcte. **Les deux observations n'ont pas été réconciliées.** Hypothèses non
tranchées : aperçu de la carte (`MarkdownPreview`) confondu avec le document ; table venue en
marqueurs `[TABLE:N]` (chemin différent, fonctionnel) ; décompte incluant la ligne d'en-tête (un
« 3×4 » pouvant être carré côté code). **Décision Ben : on en reste là** puisque le fix résout le
cas mesuré sans régression — mais l'écart est consigné ici, et les goldens `Tmd` (insert+replace)
servent désormais de test de non-régression sur ce chemin.

### Session 2026-07-21 (ter) — FIDÉLITÉ des ressources réinjectées + bug `Api.CreateTable`

**Question de Ben** : « ne peut-on pas faire mieux que le tableau à plat ? peut-on avoir une *copie* sérialisée des ressources référencées par un fragment, fournie à Scribe et renvoyée à l'injection ? » — **Oui, et c'était déjà à moitié câblé** (`79a720a8e`).

**Le levier** : `table.ToJSON(true, true)` est une opération de **LECTURE** ⇒ elle ne viole PAS la contrainte « le contexte ne mute pas le document » (celle qui interdit `SetName`), et elle **préserve les fusions**. C'est déjà le format `tableSnapshots`, déjà un champ de `PANEL_ACTION` (`protocol.js:87`) et déjà consommé **en priorité** par `reconstructTable`. Manquait seulement : que l'extraction document les produise et que l'hôte les renvoie.

- **Plugin** : `buildDocumentExtractionResult` collecte `docTableSnapshots[tableIndex] = el.ToJSON(true,true)` au moment où il émet `[TABLE:N]`, et la réponse `cozy-bridge:document-extracted` les transporte.
- **Hôte** (`View.jsx`) : `docTableSnapshotsRef` les conserve ; `snapshotsForFragment(text)` les renvoie au clic, **filtrés aux seuls `[TABLE:N]` présents dans le fragment** — le canal retour `PANEL_ACTION` est plafonné à **1 Mo** (`validateIntent`), contrairement au canal d'extraction qui le contourne délibérément.
- Le rebuild à plat (`createTableFromMarkers`) devient le **dernier recours**.

**Résultat live** : clone **strictement identique** à l'original — `identique: true` (fusion H ligne 3 = 2 cellules logiques au lieu de 3 ; continuation V = cellule vide). Fidélité **complète**, y compris fusions.

**🔴 BUG PRÉEXISTANT TROUVÉ AU PASSAGE — `Api.CreateTable` prend `(LIGNES, COLONNES)`**, pas `(colonnes, lignes)`. Le code passait `Api.CreateTable(nCols, nRows)` ⇒ **tout tableau NON CARRÉ** levait `Row index N is out of bounds` et faisait échouer **TOUTE l'injection, le texte autour compris**. Invisible jusqu'ici car **tous les cas testés étaient carrés (2×2)**. Prouvé en live : un markdown **3 colonnes × 2 lignes** n'insérait **rien** ; arguments inversés ⇒ `2 lignes × 3 colonnes`, contenu `A B C / 1 2 3` correct. Corrigé aux **2** sites (chemin markdown-pipe + `createTableFromMarkers`).

**Piège re-payé** : `log()` dans le bac à sable d'un `callCommand` peut lever une `ReferenceError` — mon `try/catch` la transformait en `return null` (= tableau perdu). Logs retirés de `createTableFromMarkers`.

Non-régression : `T3/insert` identique au golden ; repli à plat OK même avec des **trous** de grille ; oracle **39/39**, verify-bundles **66/66**, specs hôte OnlyOffice **340/340**, `yarn build` OK.

### Session 2026-07-21 (bis) — PANNEAU LATÉRAL : Insérer/Remplacer perdait TABLEAUX et IMAGES — CORRIGÉ

**Symptôme (Ben)** : dans le side panel, les boutons *Insérer*/*Remplacer* d'une carte de fragment contenant une image ou un tableau **perdent** l'image et le tableau ; **le texte autour est bien inséré**.

**Reproduction déterministe, sans Drive ni LLM** : le listener `PANEL_ACTION` du plugin est un simple `addEventListener("message")` → on lui poste directement le message que le panneau enverrait (`{type:'cozy-bridge:intent', version:1, action:'PANEL_ACTION', source:'cozy-drive-panel', data:{action,text,html,md}}`, forme donnée par `src/lib/cozy-bridge/protocol.js:84`). Reproduit du premier coup sur `table-plain` : `Avant.` + `Apres.` insérés, **tableau absent**.

**CAUSE RACINE UNIQUE (elle explique les deux)** — le contexte du chat est extrait en **mode « document »**, un mode conçu **lecture seule / non réinjectable**, mais le panneau **réinjecte** ses marqueurs. Le code l'assumait déjà noir sur blanc (`scripts/code.js:3674` : « *CONTEXT (whole-document) extraction … **never SetName — its markers are never reinjected*** »). Invariant violé : **un marqueur est une référence à un état du document que seule l'extraction de SÉLECTION matérialise.**
- **Tableaux** : `buildDocumentExtractionResult` émet `[TABLE:N]`/`[CELL:r,c]` **sans** produire `tableSnapshots` ni `tableDocIndices` → `reconstructTable` n'avait ni snapshot ni table d'origine → renvoyait `null` → les **3** sites d'appel faisaient `continue` → placeholder **sauté silencieusement**. (La branche `replace` perdait aussi le tableau par un autre chemin : `isStructuralFull` faux + `if (origTable)` faux ⇒ rien.)
- **Images** : le nom `scribe-img-N` émis en mode document est **fictif** — prouvé live sur `img-para` : contexte annonçant `scribe-img-1/2/3` alors que le document a **2 dessins TOUS SANS NOM** → `injectDrawingInto` ne résout rien → paragraphe image **jeté sans trace**.

**Correctifs** (décision produit Ben : reconstruire les tableaux depuis les marqueurs ; pour les images, ne plus perdre en silence) :
- `574b4ff60` — `createTableFromMarkers()` construit un tableau neuf à partir des seuls marqueurs (dimensions = max r/c + 1, style aligné sur le chemin markdown-pipe) ; `reconstructTable()` prend les cellules en 3ᵉ argument et l'utilise **en dernier recours** ; `fillTableCells()` factorise ; branche `replace` : nouveau cas `!origTable` → on insère le tableau reconstruit. ⚠️ La mise en forme d'origine (polices/largeurs/**fusions**) n'est pas récupérable sur ce chemin — **fidélité du CONTENU préférée à la perte silencieuse**.
- `a6f65d550` — mode document : plus de handle réinjectable, un token descriptif **`[image]`** (4 sites : 1 bloc + 3 inline) ; + **filet de sécurité** à l'injection : un marqueur image non résolu laisse un paragraphe **visible** `[image]` (italique) + log + compteur.

**Vérifié LIVE** (builds `2026-07-21.1` / `.2`) : panneau insert → `Avant.` / `TABLE[AA,BB,CC,DD]` / `Apres.` ; panneau replace → tableau inséré **et original intact** (⚠️ le 1ᵉʳ essai montrait l'original disparu = artefact d'`asc_undoAllChanges` sur un insert de tableau, **re-uploader une fixture fraîche entre cas de table**) ; contexte document → `Photo [image][image]`, **zéro handle fictif** ; extraction SÉLECTION → `{{IMG:scribe-img-0}}` préservé ; **aller-retour image inline → drawings 2→3, vraie image réinjectée**. Non-régression inline **identique aux goldens** : `T3/insert` (clone complet + post-sél `«w»«x»«y»«z»`), `T2a/insert` (clone réduit 1×2 + `«AA»«BB»`), `T3/replace` (in-place `[p,q,r,s]`). Oracle **39/39**, verify-bundles **66/66**, specs hôte Scribe **296/296**.

**Reste ouvert (non corrigé, à cadrer)** : `castEmptySelection` (`scripts/code.js:3233`) remet `lastTableSnapshots` à `null` mais **oublie `lastTableDocIndices`** → des indices périmés peuvent survivre et faire reconstruire un `[TABLE:0]` du chat à partir d'**un autre tableau du document** (corruption silencieuse et non déterministe, pire que la perte). Non déclenché par les cas testés, mais réel.

### Session 2026-07-21 — « litière de runs vides » INVESTIGUÉE → reclassée COSMÉTIQUE (contagion infirmée)

**Question posée** : la litière est-elle un vrai bug utilisateur ? Le backlog affirmait qu'un run vide **gras** rend gras le texte tapé ensuite. **Réponse : NON, non reproductible.**

**Mesure (preuve `after.docx`, jamais `model.json` qui est aveugle aux runs vides — `paraToBlock` les saute, `scripts/code.js:5417`)** — comparaison `before.docx` (fixture) vs `after.docx` sur les 67 bundles :
- **Étalon** : un ¶ **non touché** gagne exactement **1** run vide en fin de ¶ ⇒ artefact du save OO, normal. Tout excédent = litière Scribe.
- **63/67 bundles** ont ≥1 run vide excédentaire (replace ≈ 4, jusqu'à 8 sur T6 ; insert ≈ 2-3).
- **1 seul bundle** porte un run vide **formaté** : `A6/replace`, ¶1 = `'Second' | ' ' | VIDE[GRAS] | 'er flows' | VIDE | VIDE`.
- **Pourquoi 1 seul** : **11 fixtures sur 13 sont en texte plain** (seules `format-family` et `a8-large` ont du formatage inline) ⇒ le corpus **sous-détecte structurellement** cette variante (recoupe la question **Q1**). En documents réels (formatés) l'occurrence serait bien plus fréquente — d'où l'intérêt de trancher la nocivité.

**Test live (oo-dev monté sur ce worktree, build `2026-07-20.1`, fixture `format-family`, scénario A6/replace rejoué à l'identique — extraction ` brown *fox*\n\nJumps over the dog\n\nLazy riv` conforme au golden)**. Frappes **clavier réelles** (pas d'API `AddText`), 3 scénarios :
1. curseur posé à la jonction (offset 7, `P2@7..P2@7`) → frappe `ZZZ` → **`' ZZZ'` NON gras** ;
2. flux naturel : post-sélection vive `«Second »` → **flèche droite** → frappe `QQQ` → **`' QQQ'` NON gras** ;
3. **save → re-parse → réouverture** (`.docx` re-uploadé comme nouveau fichier, contenant bien `VIDE[GRAS]`) → frappe `WWW` → **`' WWW'` NON gras**.
Contrôle : le modèle rapporte bien le gras quand il existe (`{"t":"quick","b":1}`) ; screenshot = `WWW` en romain sous un `quick` gras.

**Conclusion** : OO rattache le formatage du caret au run **texte** adjacent et **ignore les runs de longueur nulle**. La litière est du **bruit structurel** (documents plus lourds, `.docx` moins propre), **pas** un bug visible par l'utilisateur. ⇒ **Ne pas corriger pour l'instant** : le seul correctif envisagé (garde dans `appendRunsPreserving`, `scripts/code.js:2060-2071`) toucherait le cœur de la fusion A6 dont dépendent des goldens fraîchement bénis, pour un gain nul côté utilisateur.

**Acquis techniques à conserver** (utiles si le sujet revient) :
- **Cause racine du 4-vs-2** : en REPLACE la sélection est passée **vive** à `doc.InsertContent(content, true)` (`scripts/code.js:2361`) ⇒ OO **vide les `ParaRun` sans les délier** ; en INSERT le curseur est **collapsé** d'abord (`scripts/code.js:1023-1028`) ⇒ rien à détruire.
- **Fabrique du run vide formaté** : `appendRunsPreserving` (`scripts/code.js:2060-2071`) fait `nr.AddText(el.GetText() || "")` pour **chaque** élément source **sans filtre**, puis recopie le `TextPr` ⇒ crée un run vide *gras* et **propage** la litière de l'hôte.
- 🚨 **PIÈGE si on corrige un jour** : une **image inline est un run dont `GetText()` vaut `""`** (`injectDrawingInto`, `scripts/code.js:1179+`, cf. commentaire `scripts/code.js:3793`). Un pruner naïf « texte vide ⇒ supprimer » **détruirait les images**. Toute garde doit être « vide **ET** sans drawing ».
- Aucun nettoyage de runs vides n'existe dans le plugin ; `cleanupTrailingBlockPara` / `cleanupLeadingSpacer` opèrent au niveau **paragraphe** uniquement.

### Session 2026-07-20 (bis) — AXE H BÉNI → corpus intégralement validé

Les **10 bundles axe H** (tableaux en **en-tête/pied** : `H1`/`H2`/`H3`/`H4`/`H-reg`, insert+replace) **bénis par Ben** via la console `gen_blessing.py` (baseline `blessed-2026-07-20`) : **10/10 OK, 0 KO**. Verdicts `pending → pass`, jugés sur `selMarkup` (commit `c7a732e05`, tag `blessed-2026-07-20-H`). Couvre au passage la re-bénédiction de `H1`/`H-reg` insert (sélection full-table corrigée par le fix ④ `5348469ab`) et le cross-frontière en-tête↔corps `H2`, l'intra-cellule d'en-tête `H3`, les cellules partielles `H4`, la régression de ciblage §4quater `H-reg`. **Corpus désormais 68/68 `pass`, 0 `pending`.** Seul reste-à-faire de la campagne = bug **⑤(b) T-reduc** (cadré, parké au backlog Phase 999.2, décision produit en attente).

## Session 2026-07-17 (ter) — la passe de re-capture des 62 (build `.9`) FAITE

Les 62 goldens re-capturés en une passe (aucun `code.js` touché ⇒ build inchangé `.9`). Preuves complètes partout (`verify-bundles.py` : **62/62 complete**), oracle **34/34**. Le corpus a **enfin** un oracle de sélection (`selText`/`selMarkup` peuplés partout). Verdicts humains **jamais** touchés ; un bloc `blessing` ajouté à chaque `meta.json` dit ce qui reste à bénir. Présentation au gabarit = `test-harness/tools/render-review.py --all`.

| ID | Constat | Décision | Statut |
|----|---------|----------|--------|
| **selText jeté par la CHAÎNE, pas « antérieur au champ »** | 🔴 La cause du corpus sans oracle n'était PAS « les captures précèdent le champ » : `dumpState` émet bien `selText`/`selMarkup` (frères de `selection`), mais **`capture-driver.js` ne forwardait que `blocks`+`selection`** ET **`normalize.mjs` appelait `normalizeModel({blocks, selection})`** — les 2 étages jetaient l'oracle. Une re-capture « fidèle à la recette » aurait ré-écrit `selText:null` ×62 sans s'en apercevoir (le mode d'échec même de ce backlog). | **CORRIGÉ** : les 2 outils forwardent la capture entière ; A0/insert = `«XXX »The quick brown fox`, `blocks` byte-identiques au golden béni. | ✅ FAIT |
| **`capture-driver.js` ne parsait pas** | 🔴 Le fichier « trou (c) ✅ RÉSOLU — driver committé » **échoue `node --check` au HEAD** : ligne 8 le chemin `corpus/*/capture.json` dans un commentaire de bloc — le `*/` **ferme le commentaire** → tout ce qui suit = erreur de syntaxe. Donc le driver committé n'a jamais tourné tel quel (les captures H passaient par une variante collée à la main). | **CORRIGÉ** + note dans l'en-tête pour ne pas réintroduire le `*/`. | ✅ FAIT |
| **`finish.sh` avalait un échec de token** | 🟠 `assemble.py \| tail -1` sous `set -e` **sans `pipefail`** : le pipeline sort avec le code de `tail` ⇒ un token absent (inject non persisté) **ne stoppait pas** le script → un bundle sans preuve de persistance serait rapporté « capturé ». Exactement le mode d'échec de ce backlog. | **CORRIGÉ** : `set -eo pipefail`. Détecté par un sous-agent, pas par moi. | ✅ FAIT |
| **🆕 Extraction cellule : -1 caractère envoyé au LLM** | 🔴 **BUG PROD, découvert cette passe.** Toute sélection dans une cellule **hors dernière colonne** perdait son **dernier caractère** au moment de l'extraction → le **LLM recevait `Alph` pour `Alpha`**, `The quick brown fo` pour `…fox`. Le `range.GetText()` (raw) est juste (`Alpha`) ; c'est le clip `md` qui coupait (`Alph`). Cause : l.4457 `paraText` ne strippait que `\r\n` traînant, mais le `GetText()` d'une cellule finit par **`\t`** (terminateur de cellule) que ni les runs ni `range.GetText()` ne contiennent ⇒ `paraText` (`Alpha\t`, 6) plus long que `rangeText` (`Alpha`, 5) ⇒ la sélection **entière** est prise pour **partielle** ⇒ `clipEnd=1`. Dernière colonne finit par `\r\n` (strippé) ⇒ épargnée (`Beta` OK). **Même famille que le fix A3** (`\r\n`). | **CORRIGÉ build `.10`** : strip du `\t` terminateur de `paraText` ET `rangeText`, **gate intra-cellule** (`GetParentTableCell`) pour ne pas couper un tab tapé en fin de ¶ normal (que les runs contiennent). **Vérifié LIVE `.10`** : `T1.C(0,0)@start..@end` → `md:"Alpha"` (était `Alph`) ; `@start..@mid` → `md:"Al"` (était `A`) ; `Beta`/top-level inchangés. **N'affecte AUCUN `model.json`** (l'injection utilise la fixture md, pas l'extraction) ⇒ oracle **34/34**, `blocks` byte-identiques (vérifié T1/insert). Seul l'`extractedMd` (debug) des cas mono/intra-cellule change ⇒ ces bundles re-capturés sur `.10` (T1, T8, Ac1–Ac6, H3 ; les cas clone `[CELL:...]` n'étaient PAS clippés, autre chemin). | ✅ **FAIT (`.10`)** |
| **4 écarts de comportement = règles bénies que le golden précède** | Les 4 seuls `blocks` qui diffèrent du golden : **A8/insert · C1/insert · H3/insert** = règle A1/A5 « bord de ¶ → nouveau ¶ » (build `.2`) ; **T5/insert** = règle A6 « le dernier ¶ fusionne le suffixe » (build `.4`). Aucune régression. | à bénir (le golden rattrape la règle). | 🟡 à bénir |
| **T9/insert : image ENFIN ré-injectée** | La fixture corrigée (`![IMG:<nom réel>](placeholder)` au lieu du marqueur nu) fait passer `after.docx` de **`a:blip` 1 → 2** : le golden béni **ne ré-injectait aucune image**. Round-trip prouvé visuellement (`after.png` : image rouge dans le clone). Le nom a dérivé `scribe-img-0`→`scribe-img-2` au replace et a survécu à l'undo (gotcha #4) — le driver le résout en direct. | bénir la nouvelle fixture. | 🟡 à bénir |
| **58/62 `blocks` byte-identiques** | Le comportement est **stable** : 58 cas ont des `blocks` identiques au golden béni, seul l'oracle de sélection est neuf. | bénir en masse sur `selMarkup`. | 🟡 à bénir |

**Outils ajoutés cette passe** (committables) : `verify-bundles.py` (contrôle mécanique de complétude : 7 fichiers, `selText` non-null, `model.json` = normalisation de CE `capture.json`, `after.docx` contient vraiment le texte injecté via **nœuds de texte** — pas la regex brute qui matche `<w:t>w</w:t>` faussement, PNG non-blancs) ; `render-review.py` (gabarit depuis les preuves : `selMarkup` verbatim, image prouvée par `after.docx` jamais par le modèle, cellules lues sous `grid` pas `rows`) ; `capture-driver.js` étendu (phases Before/After pour le `before.png` avec la sélection posée + résolution `__IMG__` depuis l'extraction vive).

**Trouvaille T3/insert (à investiguer)** : le `after.docx` sauvé met un **`Delta2` fantôme** dans la cellule (1,1) du tableau **inséré** (le modèle vif et l'`after.png` disent `['z']` seul ; le SAUVÉ dit `['z','Delta2']`). Le clone copie la cellule source (2 ¶ : `Delta`,`Delta2`), remplace le 1ᵉʳ par `z`, mais la **suppression du 2ᵉ ¶ ne va pas jusqu'au save**. **Byte-identique au `after.docx` béni** ⇒ pré-existant, pas cette passe. Invisible au modèle ET au screenshot, visible seulement dans `after.docx` — d'où l'exigence de la recette. 📋 à investiguer.

### Recette de re-capture — pièges payés cash le 2026-07-17 (lire AVANT de relancer une passe)
1. **Un ré-upload par fixture, obligatoire.** Un contexte navigateur neuf ne suffit **pas** : rouvrir un `fileName` déjà muté **rejoint la même session d'édition OO** (même clé) et sert le document **pollué** (autosave). `curl -s -X POST http://localhost/example/upload -F "uploadedFile=@test-harness/fixtures/<f>.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"` → nouveau nom → nouvelle clé.
2. **`asc_undoAllChanges` fonctionne** entre cas **sur une page donnée** (`resetOk` vérifié sur les 62). Donc : 1 upload frais + 1 page par fixture + undo entre cas. ⚠️ **L'undo ne défait PAS le `SetName` des images** (hors historique).
3. **Reprendre `spec` ET `md` EXACTS depuis `capture.json`** — jamais les retaper (T2a/replace = `CC|DD`, T3/replace = `p|q/r|s` ; un md retapé fabrique de faux écarts).
4. **Images : ne JAMAIS coder `scribe-img-0` en dur.** L'extraction renomme à chaque passage (compteur qui survit à l'undo) → prendre le marqueur que `extractSelection` vient d'émettre (forme `![IMG:<nom>](placeholder)` ; la forme nue n'est pas du markdown image). Même règle que `[CELL:r,c]`.
5. **Comparer le JSON INTÉGRAL du modèle**, pas un aplatisseur de texte : le mien masquait H3/insert (2 ¶ de cellule vs 1 → même chaîne).
6. **`dumpState` ne voit ni images ni `numPr`** → vérifier l'image via `GetAllDrawingObjects().GetName()` ou `after.docx`, jamais via `model.json`.
7. **`after.docx`** : POST `/command/` `{c:forcesave,key}` (key = `window.config.document.key`) → **attendre ~3 s** (callback async) → GET `/example/download?fileName=`. ⚠️ le forcesave **pollue** la copie serveur → re-uploader pour un test de base propre.
8. **`before.png`/`after.png`** : la sélection **et** la post-sélection se rendent **sans `grabFocus`** (pas de vol de focus). Activer les marques ¶ : `Asc.editor.put_ShowParaMarks(true)`.
9. **Onglets** : 1 seul `isolatedContext`, `background:true`, fermer avant d'en ouvrir un autre — désormais **appliqué par un hook** (`~/.claude/hooks/chrome-mcp-tab-guard.sh`).

## Hors cas identifiés

| ID | Cible (Ben) | Repro | Décision | Statut |
|----|-------------|:-----:|----------|--------|
| **HIST-img** | fragment d'historique (inline→side-panel) réutilisé : la référence image **n'est pas ré-injectée** (perdue dans l'historique ?) | ✅ **RÉSOLU 2026-07-21** — cause identifiée et corrigée (`a6f65d550`) : ce n'était pas « perdu dans l'historique » mais un **handle fictif** émis par l'extraction de contexte (mode document, qui n'appelle jamais `SetName`). Voir § Session 2026-07-21 (bis). | corrigé | ✅ FAIT |
| **PANEL-tbl/img** | panneau latéral : les boutons **Insérer/Remplacer** d'un fragment contenant un **tableau** ou une **image** perdaient le tableau et l'image (le texte autour passait) | ✅ (live, `PANEL_ACTION` posté au plugin) | **CORRIGÉ** (`574b4ff60` tableaux, `a6f65d550` images) | ✅ FAIT |

---

## §4quater (rappel — clos cette session, avant le backlog UAT)
Tables d'en-tête/pied : classification, insert-après-table-haut, mixed-replace → tous corrigés.
Axe H : 10/10 goldens pass (verdicts `pending` à bénir par Ben). Backlog contenu résiduel :
`color` (L#5), `crossref` (L#4).
