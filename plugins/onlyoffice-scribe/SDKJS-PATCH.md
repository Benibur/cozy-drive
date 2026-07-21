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

### ⚠️ D'abord : OÙ un patch a le droit de vivre

**À vérifier avant d'écrire une ligne.** Seul `sdk-all.js` est monté/patché.
`sdk-all-min.js` est le bundle **stock minifié**, chargé **en parallèle**, et les deux
**ne contiennent pas les mêmes fichiers** :

| Bundle | Contient (entre autres) | Patchable ? |
|---|---|---|
| `sdk-all.js` | `word/apiBuilder.js`, `word/Drawing/DrawingDocument.js`, `word/Drawing/HtmlPage.js`, `word/Editor/Document.js` | ✅ oui |
| `sdk-all-min.js` | **`word/api.js` (`asc_docs_api`)**, `common/apiBase_plugins.js` | ❌ non (stock) |

⇒ **une méthode ajoutée à `word/api.js` n'est JAMAIS chargée** : la version stock gagne
et **rien ne signale d'erreur** (symptôme : `typeof Asc.editor.maMethode === "undefined"`
alors que `grep` la trouve dans le bundle). **Le piège est tombé deux fois** — d'abord sur
`pluginMethod_*` dans `apiBase_plugins.js`, puis sur `asc_docs_api.prototype.*` dans
`api.js`. Le **modèle document** (`word/Editor/Document.js`) est en revanche patchable.

Contrôle mécanique, avec un symbole propre au fichier visé :

```sh
grep -c asc_canEditGeometry sdk-all.js       # 0 -> word/api.js n'est PAS ici
grep -c asc_canEditGeometry sdk-all-min.js   # 2 -> il vit là
```

⚠️ `grep -c` compte des **lignes** : lire les lignes trouvées, pas seulement le compte
(un commentaire citant le symbole suffit à fausser la conclusion).

### Fichiers modifiés (diff net vs `v9.4.0.129`)

| Fichier | Contenu ajouté |
|---|---|
| `word/apiBuilder.js` | `ApiRun.GetInlineDrawings()` + `Api.GetSelectionScreenRect()` (ce dernier n'est qu'un **relais**) |
| `word/Drawing/DrawingDocument.js` | `GetSelectionScreenRect()` (le calcul réel) + `NotifySelectionGeometryChanged()` + appel depuis `CheckTargetDraw` |
| `word/Editor/Document.js` | Appel de `NotifySelectionGeometryChanged()` depuis `private_UpdateSelection` |
| `common/base-plugin-events.js` | Documentation de l'événement `onSelectionGeometryChanged` |
| `tests/word/plugins/pluginsApi.js` | Tests QUnit (non embarqués dans l'artefact) |

### API exposée au plugin

| Élément | Rôle côté Scribe |
|---|---|
| `ApiRun.prototype.GetInlineDrawings()` | Position des images *inline* d'un run → round-trip d'images |
| `Api.GetSelectionScreenRect()` | Rect écran de la sélection `{left, top, width, height, corners, viewport}` |
| **Événement `onSelectionGeometryChanged`** | **Push** `{rect, hasText}` quand la géométrie de la sélection change **ou bouge** |

Chaque méthode est exportée sous sa forme string (`Api["GetSelectionScreenRect"]`, …)
pour survivre à la minification.

### Pourquoi un événement poussé plutôt qu'une lecture à la demande

Un plugin ne peut atteindre le builder que par `callCommand`, **qui tronque la pile de
redo**. Interroger la géométrie à chaque changement de sélection — a fortiori à chaque
frame de scroll — détruirait le redo de l'utilisateur. Le push ne coûte **aucun**
`callCommand`.

L'émission a lieu depuis **deux** sites, et les deux sont nécessaires :

| Site | Couvre | Sans lui |
|---|---|---|
| `DrawingDocument.CheckTargetDraw` | la sélection **BOUGE** (scroll, zoom) | l'UI ancrée reste plantée en place au scroll |
| `CDocument.private_UpdateSelection` | la sélection **CHANGE** (souris, clavier, API) | l'UI n'apparaît **qu'après un scroll** (bug réel) |

Garde-fous : calcul uniquement si `IsSelectionUse()`, et **déduplication** sur la clé
géométrique (viewport inclus) — une sélection immobile ne produit aucun message.
Côté plugin, l'événement doit être **déclaré dans `config.json`** (`"events": [...]`),
sinon le dispatch OO ne le livre pas.

Le champ **`viewport`** (zone visible du document, même repère) permet au consommateur de
masquer son UI quand la sélection sort de la vue — sans lui, l'UI flotte au-dessus de la
barre d'outils OO.

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
> Avec les deux corrigés, la sortie est **byte-identique**. Artefact courant
> (2026-07-21) : sha256 `4629ca980af785e0d285bc7c1aaca0879795a9aac797845d650e14675a168d99`.
> *(L'ancien `d158aeaf…` est l'artefact du 2026-07-09, antérieur aux 2 corrections de
> coordonnées et à l'événement poussé.)*

Puis packaging (étape manuelle, convention Scribe) vers `dist/` :

```
dist/sdkjs-patch-9.4.0.129/
├── sdk-all.js          # copie de deploy/sdkjs/word/sdk-all.js
├── sdk-all.js.sha256
└── README.txt
```

Vérifications rapides :

```sh
grep -c GetInlineDrawings             sdk-all.js   # 4
grep -c GetSelectionScreenRect        sdk-all.js   # 7  (calcul + relais builder + doc)
grep -c NotifySelectionGeometryChanged sdk-all.js  # 4  (définition + 2 appels, dont 1 gardé)
grep -c AscOForm                      sdk-all.js   # 69 (3 => chemin --addon relatif)
sha256sum -c sdk-all.js.sha256
```

> **Un compte à 0 sur les deux du milieu** = le code a atterri dans un fichier **absent
> du bundle** → relire le §1 « OÙ un patch a le droit de vivre ».

---

## 5. Injection dans OnlyOffice

L'artefact remplace `/var/www/onlyoffice/documentserver/sdkjs/word/sdk-all.js`.

### ⚠️ Installer le bundle ne suffit PAS à le servir

Trois caches se superposent ; chacun sert silencieusement l'ancien code, sans erreur :

1. **Le jumeau `sdk-all.js.gz`** — à **chaque démarrage** du conteneur, OO exécute
   `/usr/bin/documentserver-static-gzip.sh` :
   ```sh
   find ./sdkjs ./web-apps ./sdkjs-plugins ./dictionaries -name '*.js' … -exec gzip -kf9 {} \;
   # puis active gzip_static dans nginx
   ```
   Un `.gz` est donc fabriqué depuis ce qui est monté **à cet instant**, et nginx sert
   ensuite ce jumeau à tout client qui accepte gzip — tous les navigateurs.
   ⇒ **Remplacer le `sdk-all.js` monté sur un conteneur déjà démarré** (c'est-à-dire :
   itérer sur le patch) laisse le `.gz` figé sur son contenu de démarrage, qui **masque
   silencieusement** le nouveau fichier — réponse 200, aucun avertissement.
   `oo-dev-setup.sh` régénère le `.gz` à chaque lancement (sans effet sur un conteneur
   neuf, où le gzip de démarrage a déjà pris notre fichier).
   *Le même mécanisme explique les `.gz` du plugin* (`sdkjs-plugins` est dans le même
   `find`) — d'où leur purge, déjà présente dans le script.
2. **Cache du service worker OO** — `sdkjs/` était dans `g_cacheablePrefixes`, servi en
   *cache-first*, **avant** le réseau. `oo-dev-setup.sh` retire ce préfixe.
3. **Cache disque `immutable` du navigateur**, sous une **URL inchangée** ⇒ un
   **contexte navigateur neuf** reste obligatoire après un changement de SDK.

**La vérification qui ne ment pas** se fait sur le fil, pas dans le conteneur :

```sh
curl -sH 'Accept-Encoding: gzip' http://localhost/9.4.0-129/sdkjs/word/sdk-all.js \
  | gunzip | sha256sum        # doit égaler le sha de dist/
```

- **Dev (oo-dev)** : `scripts/oo-dev-setup.sh` monte le `dist/…/sdk-all.js` en
  bind-mount `:ro` dans le conteneur (le fichier hôte reste éditable).
  ⚠️ Un bind-mount de **fichier unique épingle l'inode** : installer avec
  `cat deploy/sdkjs/word/sdk-all.js > sdk-all.js` (en place). Un `cp`/`mv` crée un
  **nouvel inode** et le conteneur continue de servir les anciens octets, sans erreur.
- **Intégration/prod** : l'artefact est *baké* dans une image OO dérivée (voir la
  chaîne de déploiement intégration ; l'artefact est distribué comme asset de
  release).

L'artefact `sdk-all.js` est un **binaire dérivé** : ne pas le committer dans
cozy-drive ; le publier comme release et l'épingler par version.

---

## 6. État upstream

- `GetInlineDrawings` → PR ONLYOFFICE **#4868**.
- `GetSelectionScreenRect` **+ `onSelectionGeometryChanged`** → brique prête
  (`feature/get-selection-screen-rect-9.4.0.129`), PR upstream à ouvrir. La brique porte
  désormais 4 commits : la méthode, 2 corrections de repère (offset conteneur, puis offset
  des règles) et l'événement poussé + `viewport`.

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
