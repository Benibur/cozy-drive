# Harness selection-cases — RUNBOOK

**But de ce document** : décrire l'**état réel et opérationnel** du harnais de test des cas de
sélection Scribe, tel qu'il tourne aujourd'hui sur `feat/scribe-in-right-panel`. C'est le point
d'entrée pratique (« comment je lance l'oracle », « comment je capture un golden »), complémentaire
de `.planning/TEST-STRATEGY.md` (le *pourquoi* / cadrage) et de `.planning/SELECTION-CASES.md`
(la *spec* = comportements attendus, glossaire L#1–L#8, §4bis fusions, §4quater en-tête/pied).

> ⚠️ `TEST-STRATEGY.md` cite encore le worktree `cozy-drive-selection-tests` /
> branche `test/selection-cases-harness` comme lieu de travail « courant ». **C'est périmé** :
> ce worktree a été supprimé le 2026-07-02 et **tout le harnais vit désormais sur
> `feat/scribe-in-right-panel`** (worktree `cozy-drive-scribe-in-right-panel`, monté par `oo-dev`).
> Voir « Trous connus » plus bas.

Dernière carto vérifiée : **2026-07-15** (après les fixes tables d'en-tête/pied `@4a984c9ba`,
`@a655c601f`, `@aa8772310`).

---

## 1. Carte des artefacts

| Chemin | Rôle |
|---|---|
| `.planning/cases.csv` | **SOURCE DE VÉRITÉ** de la matrice de cas (axes A, T, gardes). Grille éditable au tableur, diffs git texte. |
| `.planning/content-fixtures.csv` | Source de vérité de la matrice « axe contenu » (Matrice C). |
| `.planning/cases-SCHEMA.md` | Schéma des colonnes du CSV (champs exécutables + prose). |
| `.planning/tools/gen_matrices.py` | Générateur **à sens unique CSV ⇒ MD**. Réécrit les blocs `<!-- cases:table:KEY:start/end -->` de `SELECTION-CASES.md`. **Ne jamais éditer ces blocs à la main.** |
| `.planning/SELECTION-CASES.md` | Spec + glossaire + matrices générées. Prose libre HORS blocs générés. |
| `.planning/probe-merged-cells.js` | Sonde manuelle fusions (référence, §4bis). |
| `test-harness/oracle/*.spec.js` | **Oracle exécutable** (jest). Compare `{model,selection}` normalisé aux goldens. |
| `test-harness/oracle/normalizeModel.js` | Normalisation déterministe capture → modèle (whitelist, strip IDs volatils). |
| `test-harness/corpus/<caseId>/<mode>/` | Goldens bénis (voir §4 pour le layout d'un bundle). |
| `test-harness/corpus-styled*` | Variantes hôte/fixture stylés. |
| `test-harness/fixtures/*.docx` | Documents source minimaux versionnés. |
| `test-harness/fixtures/gen_fixtures.py` | Générateur reproductible des `.docx` fixtures (stdlib `zipfile`, contenu connu → golden = capture). |
| `test-harness/tools/normalize.mjs` | CLI : `capture.json` → `model.json` via `normalizeModel`. |
| `test-harness/tools/assemble.py` | CLI : forcesave OO + download `after.docx` dans un bundle, vérifie que le token d'injection a bien persisté. |
| `jest.harness.config.js` | Config jest DÉDIÉE au harnais (`roots: test-harness`, env node, swc). |
| `plugins/onlyoffice-scribe/scripts/code.js` | Addon OO + **hooks dev flag-gated** (voir §3). `var SCRIBE_BUILD` en tête = version chargée. |

---

## 2. Lancer l'oracle (couche intégration)

```sh
node_modules/.bin/jest -c jest.harness.config.js
```

État vérifié 2026-07-15 : **5 suites / 32 tests — PASS** (~1 s).

> **Pourquoi la config dédiée** : le `npm test`/`jest.config.js` par défaut de l'app a
> `roots: ['src']` → il **n'exécute pas** `test-harness/`. Toujours passer `-c jest.harness.config.js`
> pour l'oracle.
>
> **node_modules** : dans CE worktree c'est un **vrai** répertoire (`yarn install`), plus un symlink.
> (Historique : quand le harnais vivait dans un worktree dédié sans `node_modules`, on symlinkait
> ceux du voisin — ce qui cassait swc. N'est plus d'actualité ici.)

Couche unitaire (fonctions pures, sans OO) = les specs app classiques
(`tableCellMarkers.spec.js`, etc.) via `env NODE_ENV=test node_modules/.bin/jest <path>`.

---

## 3. Vérifier la matrice CSV ⇄ MD

```sh
python3 .planning/tools/gen_matrices.py --check   # exit 1 si MD désynchronisé, n'écrit rien
python3 .planning/tools/gen_matrices.py           # régénère les blocs de SELECTION-CASES.md
```

Flux : on édite `cases.csv` / `content-fixtures.csv` (au tableur ou à la main), puis on régénère.
La prose de `SELECTION-CASES.md` (définitions, §4bis, §4quater…) reste éditable librement TANT
QU'elle est **hors** des blocs `<!-- cases:table:*:start/end -->`.

> ⚠️ **État actuel (2026-07-15) : `--check` échoue** — le MD est désynchronisé du CSV parce
> qu'une note (ligne T10, ⚠️ `no_cell_match` / renvoi §4quater) a été éditée **à la main dans le
> bloc généré** de `SELECTION-CASES.md`. Régénérer maintenant **écraserait cette note**. Il faut
> d'abord porter la note dans la colonne `notes` de la ligne T10 de `cases.csv`, PUIS régénérer.
> (Trou (d) ci-dessous.)

---

## 4. Capturer un golden (recette Chrome MCP — pilote humain)

Le harnais n'a **pas** de driver auto committé (trou (c)). La capture se fait par pilotage manuel
de l'**éditeur d'exemple OnlyOffice** via Chrome DevTools MCP. Cet éditeur charge le plugin
automatiquement — **pas de Cozy, pas de login, pas de LLM**.

**URL** : `http://localhost/example/` (nécessite `oo-dev` démarré, montant CE worktree).

### Canal de pilotage
En mode `/example/`, toutes les frames sont **same-origin** (`localhost`) → depuis la page top,
`evaluate_script` traverse récursivement `window.frames` pour trouver la fenêtre du plugin qui
expose `window.__scribeTest(cmd) -> Promise`. Positionner `sw.__scribeTestForce = true` pour
activer les hooks flag-gated. (Un canal `postMessage` existe aussi pour le futur chemin Cozy réel,
qui est cross-origin.)

### Hooks dev disponibles (dans `code.js`, flag `__scribeTestForce`)
- `dumpState` → `{blocks, selection}` normalisable (l'oracle).
- `setSelection` → pose une sélection API (A0–A4 mono-¶, offsets numériques `P1@6`).
- `injectAtSelection(spec, md, mode)` → pose la sélection ET injecte la fixture dans le **même**
  callCommand (indispensable : un curseur collapsed posé dans un callCommand séparé retombe à 0).
- `extractSelection` → lance la vraie extraction sélection→md, renvoie `{text, md}`.
- `injectFixture` → injecte sans (re)poser la sélection.
- `probeTables` → diagnostic §4quater : `doc.GetAllTables()` (inclut en-tête/pied) + positions +
  `isBody` + le prédicat de chevauchement vs une sélection haut-de-corps → `collisionReproduced`.
  Sert à **prouver** qu'une fixture reproduit la collision en-tête/pied (calibré sur le vrai doc).

**Grammaire des specs de sélection** (`parseSelSpec`, séparateur `..`, PAS de virgule) :
`P<n>@<kind>` · `T<n>.C(r,c)@<kind>` · `T<n>.full` ; `<kind>` ∈ `start|end|mid|space|<offset>`.
Ex. : `P1@start..P1@end`, `T1.full`, `T1.C(0,0)@start..T1.C(1,1)@end` (cross-cell),
`T1.C(1,1)@start..P1@end` (¶↔cellule). ⚠️ La colonne `selection` de `cases.csv` utilise une
notation descriptive `[tête,queue]` (virgule) → **le driver la traduit** vers cette grammaire.

### Procédure de capture (v3, §5bis)
1. Page fraîche `new_page({ url, isolatedContext })` — le plugin est servi `immutable, max-age=1an`
   et l'iframe plugin est créée dynamiquement : **un F5 ne re-fetch pas `code.js`**. Contexte neuf =
   cache froid. Vérifier `window.__scribeBuild` == le `SCRIBE_BUILD` attendu.
2. `upload_file(fixtures/<x>.docx)` sur la home d'exemple → clic EDIT → l'éditeur ouvre.
3. Warm-up : un callCommand trivial d'abord (le 1er après chargement est flaky).
4. Marques de ¶ visibles : `Asc.editor.put_ShowParaMarks(true)`. Focus sans clic (pour ne pas
   collapser la sélection) : `docEditor.grabFocus()`.
5. `injectAtSelection(spec, md, mode)` — **fire-and-forget + confirm-by-read** (attendre le callback
   d'une mutation côté page → « Promise was collected » ; lire l'état via `__scribeTest`, fiable).
6. `dumpState` → `capture.json` (si 1er appel renvoie `{error: dumpState parse… undefined}`, retry).
7. `after.docx` via **forcesave serveur** (le `downloadAs()` client ne produit pas de fichier sous
   MCP Chrome) : `test-harness/tools/assemble.py <outDir> "<fileName>" <docKey> <expectToken>`.
   `docKey` = `window.config.document.key` (PAS `docEditor.config`, non exposé dans ce build
   d'exemple).
8. Screenshots `before.png` / `after.png`.
9. `node test-harness/tools/normalize.mjs capture.json model.json` → golden normalisé.
10. Reset avant le cas suivant : `Asc.editor.asc_undoAllChanges()` (pas besoin de ré-uploader).

### Layout d'un bundle `test-harness/corpus/<caseId>/<mode>/`
```
before.png  after.png            # aide humaine au blessing (jamais juge auto)
before.docx after.docx           # source pristine / état obtenu (forcesave)
capture.json                     # capture brute {blocks, selection}
model.json                       # golden normalisé (le juge machine)
meta.json                        # verdict HUMAIN (jamais clobberé au recapture)
cases.row.snapshot.csv           # provenance : la ligne CSV au moment de la capture
```

### Politique de blessing
- Cas **✅ / pass** : capturer → vérifier visuellement une fois → geler le golden.
- Cas **⚠️ / xfail** : NE PAS geler la sortie buggée → golden **écrit à la main** = sortie
  *désirée* → test **xfail** jusqu'à correction (backlog de bug exécutable).

### Cas NON pilotables par API (restent manuels)
Sélections multi-¶ A5/A6 et à-cheval texte+tableau T4–T6 : l'API OO ne sait pas les poser
(limite L#2) → sélection **souris manuelle** par un humain.

---

## 5. Dev-env — gotchas OO

- **Cache immutable** : toute édition de `code.js` exige une page **neuve**
  (`new_page({ isolatedContext })`), pas un hard-reload. OO régénère aussi `code.js.gz` ;
  `oo-dev-setup.sh` nettoie le `.gz`.
- **Hygiène des onglets Chrome MCP** (préférence Ben — mémoire `feedback-chrome-mcp-tabs`) :
  **UN seul `isolatedContext` à la fois** + `new_page({ background: true })`. Chaque nom
  d'`isolatedContext` distinct = une **fenêtre** séparée. Le workflow de capture enchaîne les
  redéploiements `code.js` (chacun exige un contexte FROID) → à chaque redéploiement :
  **fermer l'ancien contexte** (`close_page` sur ses onglets) AVANT d'ouvrir le nouveau ; ne
  jamais laisser les contextes s'accumuler. En fin de tâche, fermer tous les onglets de test.
- **`SCRIBE_BUILD`** (en tête de `code.js`, loggé `[Scribe] build …` + exposé `window.__scribeBuild`) :
  **à bumper à chaque changement notable** de `code.js`. Sert à vérifier quelle version est chargée
  malgré le cache.
- **`oo-dev` mount** : le conteneur monte le plugin depuis CE worktree
  (`cozy-drive-scribe-in-right-panel`). `oo-dev-setup.sh` ne fait que `docker start` d'un conteneur
  existant → pour changer le montage, `docker rm -f oo-dev` d'abord.
- **Uploader de l'exemple OO cassé** (observé 2026-07-15) : le `upload_file` MCP sur le champ
  fichier de `/example/` → **502** (`ds:example` crashe), « Upload error: Undefined error », même
  sur une fixture minuscule. **Contournement** : uploader en multipart puis ouvrir l'éditeur par
  nom de fichier :
  ```sh
  curl -s -X POST http://localhost/example/upload \
    -F "uploadedFile=@FILE.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  # → {"filename":"FILE.docx",...}  puis :
  #   new_page http://localhost/example/editor?fileName=FILE.docx
  ```
- **Fichier Word volumineux/complexe** qui fait planter le converter de l'exemple depuis l'UI mais
  que `ConvertService.ashx` convertit : le **normaliser via LibreOffice**
  (`soffice --headless --convert-to docx`) — élague `styles.xml`, structure préservée.

---

## 6. Trous connus (backlog de ce chantier)

- **(a) `TEST-STRATEGY.md` périmé** — en-tête (worktree/branche) et §11 point 9 citent le worktree
  supprimé `cozy-drive-selection-tests` / `test/selection-cases-harness` comme lieu courant. À
  corriger : pointer vers `feat/scribe-in-right-panel` + ce RUNBOOK.
- **(b) [RÉSOLU par ce doc]** — absence de runbook consolidé « comment lancer l'oracle / capturer
  un golden aujourd'hui ». C'est l'objet de ce fichier.
- **(c) ✅ RÉSOLU — driver committé** — `test-harness/tools/capture-driver.js` (browser-side :
  frame walk, undo-reset, `setSelection`→`extractSelection`→`injectAtSelection`, double-lecture de
  stabilité) + `H-cases.json` (specs + md par cas). ⚠️ **L'étape extraction est OBLIGATOIRE pour
  les cas tableau** : le clone/copie-partielle lit `Asc.scope.parsedTables`, peuplé UNIQUEMENT par
  le scan d'extraction ; sans elle le clone no-op en silence. Piloté via Chrome MCP (inliner le
  fichier dans un `evaluate_script`, cf en-tête du fichier). RESTE `after.docx`/captures d'écran
  (via `assemble.py` + MCP) au moment de la passe de blessing.
- **(d) ✅ RÉSOLU** — la note T10 §4quater a été déplacée du bloc généré vers `cases.csv` T10
  `notes` ; `gen_matrices.py --check` **passe** de nouveau.
- **(H) ✅ Axe H COMPLET — 10/10 goldens pass** — fixture `table-header.docx` + **collision
  prouvée** (`probeTables`). Cas H1..H4 + H-reg câblés (`cases.csv` group `header`) + matrice
  §4quater. **2 bugs §4quater corrigés via ce harnais** : (1) insert-après-table-en-haut
  (`aa8772310`, H1/insert) ; (2) **mixed-replace corruption** (`2026-07-16.1`, H2/replace —
  test d'appartenance basé `GetParentTableCell` au lieu de positions brutes vs `GetAllTables`).
  Les 10 `corpus/H*/{insert,replace}` sont **pass** (`model.json` = sortie corrigée). RESTE :
  faire **bénir** les verdicts (`verdict:pending`) par Ben + ajouter `after.docx`/captures.

---

## 7. Plan de reprise A → B → C

- **A** *(ce document)* : écrire ce RUNBOOK. ✅
- **B** : ajouter l'axe H à `cases.csv` + régénérer le MD + déplacer la note T10 (trou d) ;
  créer `table-header.docx` via `gen_fixtures.py`.
- **C** : reconstruire et committer le driver de capture de goldens (trou c).
