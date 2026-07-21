# Cadrage — Snapshots de ressources : rattacher au MESSAGE + lever la collision de numérotation

**Créé** : 2026-07-21. **Statut** : cadrage (avant plan). **Décision Ben** : « traiter le fond, pas le symptôme ».
**Origine** : deux questions de Ben pendant la préparation de l'UAT — *« si on coche « sélection » on récupère aussi les snapshots, non ? »* et *« quid des snapshots si on utilise l'historique de discussion ? »*. Les deux ont mis au jour des failles réelles.
**Base** : `79a720a8e` (snapshots `ToJSON` du contexte document, fidélité complète vérifiée live).
**Dépend de** : [[project-panel-fragment-richloss]], `.planning/REVIEW-BACKLOG.md` § « Chantier RESSOURCES D'UN FRAGMENT ».

---

## 1. Principe directeur (rappel, posé par Ben)

> Une **copie sérialisée** vaut mieux qu'une **référence** : une référence peut pointer vers une
> ressource **modifiée depuis** la question. Réinjecter « ce qui est là maintenant » au lieu de
> « ce dont on parlait » est **pire qu'une perte** — silencieux *et* faux.

Le correctif livré applique ce principe **au sein d'un tour**. Les deux failles ci-dessous le
mettent en défaut **entre les tours** et **entre les sources de contexte**.

## 2. Faille A — les snapshots vivent dans un `ref`, pas dans le message

`docTableSnapshotsRef` (`src/modules/views/OnlyOffice/View.jsx:81`, écrit l.173) est un **ref unique**
écrasé par la **dernière** extraction de contexte. Les messages du chat, eux, vivent dans
`useState([])` (`ScribeContext.jsx:85`) et portent `{role, content, discussion, fragments}`.

Conséquence : cliquer « Insérer » sur un fragment **remonté du fil** utilise les snapshots d'une
extraction **postérieure** :
- au mieux, les index ne correspondent plus → repli sur la reconstruction **à plat** (contenu bon,
  mise en forme perdue) ;
- au pire, les index **coïncident** avec un **autre** tableau → **mauvais tableau réinjecté**, sans
  aucun signal.

C'est l'équivalent, pour les tableaux, de l'item **HIST-img** du backlog.

## 3. Faille B — collision de numérotation entre les sources de contexte

Les deux extractions numérotent `[TABLE:N]` dans des **espaces d'index différents** :

| Source | Ce que `N` désigne | Snapshots portés par |
|---|---|---|
| Extraction **sélection** | N-ième tableau **touché par la sélection** (+ `lastTableDocIndices` pour retrouver le vrai) | chaque `SELECTION_CHANGED` / `AI_TEXT_ASSISTANT` (`code.js:109-111`) → `tableSnapshotsRef` |
| Extraction **document** | N-ième tableau **du corps** | réponse `document-extracted` → `docTableSnapshotsRef` |

Or le prompt **supporte explicitement les deux ensemble** (`scribeAI.js:142` : « *when BOTH the
document and a selection are included* »). Deux tableaux différents peuvent donc être `[TABLE:0]`
**dans le même prompt** — la collision existe déjà **en amont**, indépendamment de mon code.

Et mon `snapshotsForFragment` (`View.jsx:~228`) aggrave : il préfère **aveuglément**
`tableSnapshotsRef` (sélection) même quand les marqueurs du fragment viennent du contexte document.

## 4. Contraintes dures

- 🔒 **Contrat v3.1** `{discussion, fragments}` + grammaire `{{fragment:N}}`, avec un **corpus de
  régression** (`scribeResponse.corpus.spec.js`, `scribeResponse.fixtures.js`). Toute modification de
  la **grammaire des marqueurs** y passe.
- 🔒 Le prompt impose au modèle de **préserver `[TABLE:N]`/`[CELL:r,c]` exactement** et de ne pas les
  réordonner (`scribeAI.js:99`). Toute renumérotation doit donc se faire **avant l'envoi** et rester
  stable pour tout le tour.
- 🔒 **Canal retour plafonné à 1 Mo** (`protocol.js:35`, `validateIntent`) — le filtrage « seuls les
  `[TABLE:N]` présents dans le fragment » reste **obligatoire** quoi qu'il arrive.
- 🟠 **Mémoire navigateur** : un `ToJSON` de tableau mesuré à **~8,7 Ko**. Un document à 20 tableaux
  sur 10 tours d'historique ≈ **1,7 Mo** conservés si on duplique naïvement par message.

## 5. Décisions à trancher

**D1 — Où vivent les snapshots ?**
- **(a)** attachés directement au **message assistant** (`{…, tableSnapshots}`). Simple, mais
  **duplique** un gros `ToJSON` à chaque tour partageant le même contexte.
- **(b)** *(recommandé)* **table de correspondance par « id de contexte »** : l'extraction produit un
  `contextId` ; les messages ne portent que cet id ; une `Map(contextId → snapshots)` détient les
  données une seule fois. Permet une **politique de rétention** propre (cf. D3).

**D2 — Comment lever la collision d'index ?**
- **(S-1)** *(recommandé)* **numérotation unique par requête** : à la composition du prompt,
  renuméroter les `[TABLE:N]` de **toutes** les sources dans un espace commun `0..M-1` et construire
  **une seule** table de snapshots alignée sur cet espace. → **grammaire inchangée**, corpus v3.1
  intact, et la collision disparaît à la racine.
- **(S-2)** namespacer les marqueurs (`[TABLE:d0]` / `[TABLE:s0]`) : explicite, mais **casse la
  grammaire** et impose de rejouer le corpus du contrat. Coût/risque élevé.
- **(S-3)** interdire de cocher « document » **et** « sélection » ensemble : régression UX, ne traite
  pas l'historique. À écarter.

**D3 — Politique de rétention** : garder les snapshots des **N derniers tours** ? purger au-delà d'un
budget (ex. 2 Mo) ? Au-delà, le fragment reste insérable mais retombe sur le **rebuild à plat** —
dégradation honnête, à condition que le garde-fou du §6 soit en place.

## 6. Garde-fou transversal — à faire **quoi qu'il arrive**, et en premier

Vérifier la **cohérence snapshot ↔ marqueur** avant d'utiliser un snapshot : comparer les dimensions
de la grille du snapshot au `max r` / `max c` des `[CELL:r,c]` du fragment. **Mismatch ⇒ ignorer le
snapshot** et reconstruire à plat.

Ça ne *résout* aucune des deux failles, mais ça convertit le pire scénario — **mauvais tableau,
silencieux** — en un scénario **dégradé mais honnête** (tableau à plat). ~15 lignes, entièrement dans
le plugin, aucun impact sur le contrat. **Filet, pas solution.**

## 7. Risques

- 🔴 **Le modèle n'est pas fiable sur les index** : il peut ré-émettre un `[TABLE:N]` décalé ou
  inventé. Toute solution *doit* rester valable dans ce cas ⇒ le garde-fou §6 est **non négociable**.
- 🟠 **Renumérotation (S-1)** : elle doit être appliquée **à l'identique** au md envoyé ET à la table
  de snapshots ; un décalage entre les deux recrée exactement le bug qu'on corrige.
- 🟠 **Mémoire / rétention** : sans D3, l'historique d'une longue session peut retenir plusieurs Mo.
- 🟠 **Images** : elles restent sur des **références** (décision Ben) ; ce chantier ne les couvre pas.
  Ne pas laisser croire que « snapshots » = « images réparées ».

## 8. Stratégie de test

- **Specs hôte** : composition multi-contexte (document + sélection) ⇒ numérotation **unique et
  stable**, table de snapshots **alignée** ; aucun `[TABLE:N]` en double.
- **Réutilisation d'historique** : insérer un fragment vieux de N tours ⇒ **le bon** tableau, ou
  repli à plat — **jamais** un autre tableau.
- **Garde-fou** : snapshot de dimensions incompatibles ⇒ repli à plat (test unitaire plugin).
- **Non-régression** : `scribeResponse.corpus.spec.js` **inchangé** (c'est le signe que la grammaire
  n'a pas bougé), goldens `Tmd` + axe T + axe H inchangés.
- **Preuve au SAVE** pour tout tableau réinjecté (`gridSpan`/`vMerge` dans `after.docx`).

## 9. Recommandation

1. **Poser le garde-fou §6 tout de suite** (cheap, sans risque, supprime le scénario le plus nuisible).
2. **D1 = (b)** table par `contextId` + id porté par le message ; **D2 = S-1** renumérotation à la
   composition (grammaire intacte) ; **D3** à trancher avec un ordre de grandeur mesuré.
3. **Promouvoir en vraie phase gsd** (`/gsd-review-backlog` → `/gsd-plan-phase`) : ça touche le
   stockage du chat, la composition du prompt et le pont hôte↔plugin — trop large pour de l'inline.
4. **Ne pas** toucher à la grammaire des marqueurs tant que S-1 suffit.
