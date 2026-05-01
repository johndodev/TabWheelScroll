# Multi-Browser Release — Design Spec

**Date:** 2026-05-01  
**Status:** Approved

## Goal

Consolider les branches `master` (Chrome), `edge` et `firefox` en une seule branche `master`. Un GitHub Action génère automatiquement les 3 zips lors d'un tag git.

## Contexte

Les 3 branches sont identiques à l'exception de `src/manifest.json` :
- **Firefox** ajoute `browser_specific_settings.gecko` (id AMO + version minimale)
- **Edge** retire `match_origin_as_fallback` des `content_scripts`
- Tout le code JS (`main.js`, `service-worker.js`, `popup.js`) est identique sur les 3 branches

## Structure des fichiers

```
src/
  manifest.chrome.json   ← manifest Chrome (base actuelle de master)
  manifest.edge.json     ← manifest Edge (sans match_origin_as_fallback)
  manifest.firefox.json  ← manifest Firefox (avec browser_specific_settings.gecko)
  main.js
  popup.html
  popup.js
  js/service-worker.js
  images/
```

`src/manifest.json` est supprimé du dépôt. Il est uniquement généré lors du build ou copié manuellement pour le développement local.

**Développement local :** copier manuellement le manifest du navigateur cible avant de charger l'extension :
```bash
cp src/manifest.chrome.json src/manifest.json
```

`src/manifest.json` est ajouté au `.gitignore`.

## GitHub Action

**Fichier :** `.github/workflows/release.yml`

**Déclencheur :** push d'un tag `v*` (ex: `v3.1`)

**Comportement :**
1. Créer une GitHub Release pour le tag
2. Pour chaque navigateur (`chrome`, `edge`, `firefox`) :
   a. Copier `src/manifest.<browser>.json` → `src/manifest.json`
   b. Zipper le contenu de `src/` → `tab-wheel-scroll-<browser>-<version>.zip`
   c. Attacher le zip à la Release
3. La version est extraite du tag (ex: tag `v3.1` → version `3.1` dans le nom du zip)

**Nommage des artefacts :**
- `tab-wheel-scroll-chrome-3.1.zip`
- `tab-wheel-scroll-edge-3.1.zip`
- `tab-wheel-scroll-firefox-3.1.zip`

## Migration

1. Créer `src/manifest.chrome.json`, `src/manifest.edge.json`, `src/manifest.firefox.json` dans `master` à partir du contenu des branches correspondantes
2. Supprimer `src/manifest.json` du suivi git, l'ajouter au `.gitignore`
3. Créer `.github/workflows/release.yml`
4. Les branches `edge` et `firefox` peuvent être archivées/supprimées après validation
