# Cadrage — ⑤(b) T-reduc : réduction du clone de tableau partiel FUSIONNÉ (Insert)

**Créé** : 2026-07-20. **Statut** : cadrage (avant plan). **Backlog** : ROADMAP § Phase 999.2, item ⑤(b).
**Dépend de** : [[oo-merged-cells-model]], `.planning/SELECTION-CASES.md` §4bis, `.planning/probe-merged-cells.js`.
**Base** : bug ⑤(a) (post-sélection) déjà corrigé et béni (`8c3815b30`/`57ce18914`, build `2026-07-20.1`, tag `blessed-2026-07-20`).

---

## 1. Problème

À l'**Insert** d'une sélection **partielle** de cellules d'un tableau **fusionné** (T2b fusion H, T2c
fusion V), Scribe insère un clone **COMPLET** du tableau (toutes lignes/colonnes) au lieu de le
**réduire** aux seules lignes/colonnes sélectionnées — contrairement à T2a (non-fusionné) qui réduit
correctement.

- **Contrôle** : T2a (non-fusionné, sél. `C(0,0)..C(0,1)`) → clone réduit `[[AA,BB]]`. ✅
- **T2b/T2c** (fusionnés) → clone entier. ⚠️ (UX : « pourquoi tout le tableau ? »)

## 2. Pourquoi c'est délicat (contrainte dure)

La réduction actuelle (`code.js`, boucle `pendingTableReductions`) fait
`RemoveRow(cell)` / `RemoveColumn(cell)` sur les lignes/colonnes non sélectionnées. Or
(**Q4 confirmé** par `probe-merged-cells.js`, 2026-06-17) :

> `RemoveColumn` d'une colonne **traversée par une fusion horizontale** supprime **tout le span**
> (retirer la colonne B a effacé `B3` qui couvrait B+C → **perte de données**).

D'où la décision §4bis #4 (**non négociable en l'état**) : *dès qu'une fusion (H ou V) est présente,
insérer le clone COMPLET, jamais de `RemoveRow/Column`.* C'est ce garde (`tableHasMerge`) qui produit
le clone entier. Le lever naïvement rouvre Q4.

Rappels modèle OO (sonde) :
- **Fusion H** : la ligne a **moins** de cellules logiques ; la cellule fusionnée occupe 1 index
  logique couvrant N colonnes visuelles.
- **Fusion V** : le **maître** porte le texte à sa ligne ; la **continuation** (ligne dessous) est une
  vraie cellule **vide**, jamais retournée par `GetAllParagraphs()`.
- `RemoveRow`/`RemoveColumn` **détruisent les spans**. `ToJSON(true,true)` préserve les merges.

## 3. Décision produit à trancher (débloque le plan)

Quand la sélection **coupe** une fusion (elle inclut une partie d'un span mais pas tout), que doit
contenir le clone réduit ? Trois sémantiques possibles :

- **(S-A) Bounding-box aux frontières de fusion** : étendre la région réduite pour englober tout
  span partiellement touché, puis réduire à ce rectangle (qui ne contient que des spans **entiers**).
  → aucune fusion coupée, `RemoveRow/Col` sûr sur les lignes/cols hors de la box. Réduction
  **partielle** (garde un peu plus que la sélection stricte). *Le plus sûr.*
- **(S-B) Réduction stricte + dé-fusion** : réduire exactement aux lignes/cols sélectionnées ; tout
  span coupé est d'abord **dé-fusionné** (split) puis les cellules hors-sélection retirées. Fidèle à
  la sélection mais **change la structure** (le span disparaît) → surprise possible.
- **(S-C) Statu quo assumé** : garder le clone complet quand une fusion est présente ; documenter
  comme limite v1 (c'est le band-aid actuel). *Coût nul.*

⚠️ Cas **V-merge continuation** : si la sélection ne prend que le maître (pas la continuation) ou
l'inverse, la ligne de continuation doit rester cohérente (maître+continuation ensemble ou aucun) —
sinon span V cassé.

## 4. Options d'implémentation (selon la sémantique retenue)

1. **Rebuild-from-JSON** (compat S-A et S-B) : lire la structure merges depuis `ToJSON(true,true)`,
   construire un **nouveau** tableau ne contenant que les lignes×colonnes cibles, en ré-appliquant
   uniquement les merges **entièrement inclus**. Le plus correct, le plus de code. Évite totalement
   `RemoveRow/Column`.
2. **Reduction span-aware** (compat S-A) : garder `RemoveRow/Column` mais **seulement** sur les
   lignes/cols qu'**aucune** fusion ne traverse ; pour celles traversées, soit les garder (→ S-A
   bounding-box), soit dé-fusionner d'abord (→ S-B). Moins de code, plus de cas limites.
3. **Ne rien faire** (S-C) : documenter.

## 5. Risques

- 🔴 **Corruption de spans** (Q4) : tout chemin touchant `RemoveRow/Column` sur une fusion. Doit être
  prouvé non-régressif au **save** (`after.docx` : `gridSpan`/`vMerge` dans le XML), pas seulement au
  modèle vif (`model.json` **ne voit pas** les merges — cf angle mort connu).
- 🟠 **Positions/refs post-InsertContent** (L#2) : la réduction tourne après InsertContent sur le clone
  fraîchement inséré → positions non settled (cf le piège du fix ④/⑤a ; re-sélection différée).
- 🟠 **`full`-detection gap (S5)** : une table V-merge « toute sélectionnée » est classée `partial`
  (continuation vide jamais sélectionnable) → interférence possible avec la logique de réduction.

## 6. Stratégie de test (obligatoire avant merge)

- **Challenger §4bis** : rejouer les sondes S1–S5 + Q4 de `probe-merged-cells.js` sur le clone réduit.
- **Preuve au SAVE** : `after.docx` doit conserver les `gridSpan`/`vMerge` attendus (nœuds XML), pas
  seulement l'aspect vif. `verify-bundles` ne le couvre pas → contrôle dédié.
- **Corpus** : nouveaux goldens T2b/T2c **insert** réduits + non-régression T2a (déjà réduit) et
  T2b/T2c **replace** (in-place, ne doit pas bouger).
- **Cas limites** : sélection = maître V seul ; = continuation V seule (mismatch S3) ; = 1 colonne
  d'un span H ; = span H entier.

## 7. Recommandation

- **Sémantique** : **S-A (bounding-box aux frontières de fusion)** — le seul chemin sans risque Q4 et
  sans changer la structure du tableau ; réduit « au mieux » sans jamais couper un span.
- **Implémentation** : **option 2 (reduction span-aware)** pour S-A, ou **option 1 (rebuild-from-JSON)**
  si S-B est un jour voulue.
- **Process** : promouvoir 999.2/⑤(b) en **vraie phase gsd** (`/gsd-review-backlog` → `/gsd-plan-phase`)
  vu le risque spans + le besoin de probing live + preuve-au-save. **Ne pas** l'implémenter inline.
- **Alternative légitime** : **S-C** (statu quo) si l'UX « clone complet sur fusion » est acceptable —
  le band-aid ⑤(a) rend déjà la **sélection** correcte, donc le comportement est cohérent, juste plus
  verbeux. Coût nul, zéro risque.
