# Scribe — patch sdkjs & build de `sdk-all.js`

Ce document décrit **les modifications apportées à ONLYOFFICE `sdkjs`** dont dépend le
plugin Scribe, où elles vivent, comment reconstruire l'artefact `sdk-all.js` et
comment il est injecté dans un serveur OnlyOffice.

> ⚠️ Le code sdkjs patché **ne vit pas dans ce repo (cozy-drive)**. Il vit dans le
> repo **sdkjs** (fork `Benibur/sdkjs`, upstream `ONLYOFFICE/sdkjs`). Ce repo-ci
> (`plugins/onlyoffice-scribe/`) ne contient que le **consommateur** : `code.js`
> appelle les méthodes ajoutées ci-dessous. Les deux forment un **couple
> contractuel** — si l'API sdkjs change, `code.js` casse, et inversement.

Cible : OnlyOffice **9.4.0.1** (= documentserver build `9.4.0-129`, tag upstream
sdkjs **`v9.4.0.129`**).

---

## 1. Ce qui est modifié dans sdkjs

Deux fichiers seulement (diff net vs `v9.4.0.129`) :

| Fichier | Contenu ajouté |
|---|---|
| `word/apiBuilder.js` | Les 2 méthodes de l'API plugin (voir ci-dessous) — **c'est le fichier embarqué dans `sdk-all.js`** |
| `tests/word/plugins/pluginsApi.js` | Tests QUnit des 2 méthodes (non embarqués dans l'artefact) |

### Méthodes ajoutées (dans `word/apiBuilder.js`)

| Méthode | Rôle côté Scribe |
|---|---|
| `ApiRun.prototype.GetInlineDrawings()` | Expose la position des images *inline* d'un run → extraction/round-trip d'images |
| `Api.GetSelectionScreenRect()` | Expose le rectangle écran (px) de la sélection/caret → bouton flottant sous la sélection |

Chaque méthode est aussi exportée sous sa forme string (`Api["GetSelectionScreenRect"]`,
`ApiRun.prototype["GetInlineDrawings"]`) pour survivre à la minification.

---

## 2. Source de vérité — branches sur la fork `Benibur/sdkjs`

Remotes du repo sdkjs : `fork` = `https://github.com/Benibur/sdkjs.git`,
`origin` = `https://github.com/ONLYOFFICE/sdkjs.git`.

| Branche | Contient | Rôle | Sur la fork |
|---|---|---|---|
| **`integration/scribe-oo-9.4.0.129`** | **les 2 patches** (merge des 2 briques) | **Base de build de l'artefact** | ✅ oui |
| `feature/get-selection-screen-rect-9.4.0.129` | GetSelectionScreenRect seul | Brique → PR upstream ONLYOFFICE | ✅ oui |
| `feature/getinlinedrawings-9.4.0.129` | GetInlineDrawings seul (base 9.4) | Brique 9.4 | ⚠️ locale (incluse via l'intégration) |
| `feature/api-run-get-inline-drawings` | GetInlineDrawings (base plus ancienne) | Brique → PR upstream (#4868) | ✅ oui |

**En pratique : pour builder l'artefact, utiliser `integration/scribe-oo-9.4.0.129`.**
Les branches `feature/*` sont des briques pensées pour les Pull Requests upstream
(une PR = une méthode). L'intégration les fusionne en une seule base buildable.

---

## 3. L'addon forms (upstream, requis)

Le build **remplace intégralement** le `sdk-all.js` de l'image OO. Il faut donc
ré-inclure l'addon **forms** (support des formulaires `oform`), sinon l'éditeur
perd cette fonctionnalité par rapport au stock.

- Repo : `ONLYOFFICE/sdkjs-forms`, checkout au ref 9.4 (dossier local `sdkjs-forms-94`).
- **Pristine — aucune modif Scribe.** C'est juste une dépendance de build épinglée.

---

## 4. Reconstruire l'artefact `sdk-all.js`

`build.py` est l'outil de build **officiel ONLYOFFICE 9.4** (concaténation pure,
pas de compilateur ; présent dans le tag `v9.4.0.129`).

```sh
# depuis un worktree sdkjs sur integration/scribe-oo-9.4.0.129,
# avec l'addon sdkjs-forms cloné À CÔTÉ (dossier frère de la racine sdkjs) :
cd build
PRODUCT_VERSION=9.4.0 BUILD_NUMBER=129 \
  python3 build.py --product word --addon /chemin/absolu/vers/sdkjs-forms-94
# -> sortie : deploy/sdkjs/word/sdk-all.js
```

> ⚠️ **Deux pièges vérifiés (silencieux) :**
> 1. **Chemin `--addon`.** `build.py` résout un chemin non-absolu et non-existant
>    comme `ROOT_sdkjs/../<arg>` (frère de la racine sdkjs). Lancé depuis `build/`,
>    `--addon ../sdkjs-forms-94` remonte donc **trop haut** et l'addon est
>    **silencieusement ignoré** (build « OK » mais **sans les forms**). Utiliser un
>    **chemin absolu** (ou le nom nu `sdkjs-forms-94` si l'addon est frère de la
>    racine sdkjs). Contrôle : `grep -c AscOForm sdk-all.js` doit valoir **69**, pas 3.
> 2. **Version du header.** Sans `PRODUCT_VERSION`/`BUILD_NUMBER`, le header licence
>    tombe à `Version: 0.0.0 (build:0)` — fonctionnellement OK mais non
>    byte-identique. Les fixer à `9.4.0` / `129`.
>
> Avec les deux corrigés, la sortie est **byte-identique** (sha256
> `d158aeaf528500263b02930ad17917b1d51264ac3916fecfda3bcb76e4334ae8`).

Puis packaging (étape manuelle, convention Scribe) vers `dist/` :

```
dist/sdkjs-patch-9.4.0.129/
├── sdk-all.js          # copie de deploy/sdkjs/word/sdk-all.js
├── sdk-all.js.sha256
└── README.txt
```

Vérifications rapides :

```sh
grep -c GetInlineDrawings      sdk-all.js   # attendu > 0
grep -c GetSelectionScreenRect sdk-all.js   # attendu > 0
sha256sum -c sdk-all.js.sha256
```

> Note : `sdk-all-min.js` n'est **pas** patché — sur 9.4 l'`apiBuilder` (et donc nos
> méthodes) ne vit que dans `sdk-all.js`. Ne patcher que ce fichier.

---

## 5. Injection dans OnlyOffice

L'artefact remplace `/var/www/onlyoffice/documentserver/sdkjs/word/sdk-all.js`.

- **Dev (oo-dev)** : `scripts/oo-dev-setup.sh` monte le `dist/…/sdk-all.js` en
  bind-mount `:ro` dans le conteneur (le fichier hôte reste éditable).
- **Intégration/prod** : l'artefact est *baké* dans une image OO dérivée (voir la
  chaîne de déploiement intégration ; l'artefact est distribué comme asset de
  release).

L'artefact `sdk-all.js` est un **binaire dérivé** : ne pas le committer dans
cozy-drive ; le publier comme release et l'épingler par version.

---

## 6. État upstream

- `GetInlineDrawings` → PR ONLYOFFICE **#4868**.
- `GetSelectionScreenRect` → brique prête (`feature/get-selection-screen-rect-9.4.0.129`),
  PR upstream à ouvrir.

Objectif long terme : faire intégrer ces méthodes en amont, ce qui rendrait le
patch (et cette base d'intégration) inutiles.

---

## 7. Notes de maintenance

- La branche d'intégration est un **patch-carrier fin** rebasable sur le tag
  upstream — pas une divergence permanente. La garder à 2 briques + merges.
- Toute évolution d'une des 2 méthodes doit être **rebuild → repackage `dist/` →
  re-tester le round-trip côté `code.js`** (couple contractuel).
- Les chemins de worktrees locaux (`onlyoffice-sdkjs-integ`, `-selrect`, …) sont
  spécifiques à la machine ; **la référence portable est la branche fork**, pas le
  chemin disque.
