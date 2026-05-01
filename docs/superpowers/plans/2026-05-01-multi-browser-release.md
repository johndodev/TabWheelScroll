# Multi-Browser Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolider les branches Chrome/Edge/Firefox dans `master` et automatiser la génération des 3 zips via GitHub Actions sur tag.

**Architecture:** Trois fichiers manifest séparés (`src/manifest.chrome.json`, etc.) coexistent dans `src/`. Le `src/manifest.json` est généré localement (ignoré par git). Le GitHub Action copie le bon manifest et zippe `src/` pour chaque navigateur, en excluant les fichiers `manifest.*.json` du zip final.

**Tech Stack:** GitHub Actions, bash/zip (ubuntu-latest), softprops/action-gh-release@v2

---

### Task 1 : Créer les 3 fichiers manifest

**Files:**
- Create: `src/manifest.chrome.json`
- Create: `src/manifest.edge.json`
- Create: `src/manifest.firefox.json`

- [ ] **Step 1 : Créer `src/manifest.chrome.json`** (copie du manifest actuel)

```json
{
  "manifest_version": 3,
  "name": "Tab Wheel Scroll",
  "version": "3.0",
  "description" : "Scroll tabs with alt + mouse wheel OR right click + mouse wheel.",
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "24": "images/icon24.png",
      "32": "images/icon32.png"
    },
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "images/icon16.png",
    "32": "images/icon32.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "author": "Jonathan Plantey",
  "background": {
    "service_worker": "js/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["main.js"],
      "run_at": "document_start",
      "all_frames": true,
      "match_about_blank": true,
      "match_origin_as_fallback": true
    }
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "permissions": [
    "scripting",
    "storage"
  ]
}
```

- [ ] **Step 2 : Créer `src/manifest.edge.json`** (sans `match_origin_as_fallback`)

```json
{
  "manifest_version": 3,
  "name": "Tab Wheel Scroll",
  "version": "3.0",
  "description" : "Scroll tabs with alt + mouse wheel OR right click + mouse wheel.",
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "24": "images/icon24.png",
      "32": "images/icon32.png"
    },
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "images/icon16.png",
    "32": "images/icon32.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "author": "Jonathan Plantey",
  "background": {
    "service_worker": "js/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["main.js"],
      "run_at": "document_start",
      "all_frames": true,
      "match_about_blank": true
    }
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "permissions": [
    "scripting",
    "storage"
  ]
}
```

- [ ] **Step 3 : Créer `src/manifest.firefox.json`** (avec `browser_specific_settings.gecko`)

```json
{
  "manifest_version": 3,
  "name": "Tab Wheel Scroll",
  "version": "3.0",
  "description" : "Scroll tabs with alt + mouse wheel OR right click + mouse wheel.",
  "browser_specific_settings": {
    "gecko": {
      "id": "tabwheelscroll@jonathanplantey",
      "strict_min_version": "109.0"
    }
  },
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "24": "images/icon24.png",
      "32": "images/icon32.png"
    },
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "images/icon16.png",
    "32": "images/icon32.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "author": "Jonathan Plantey",
  "background": {
    "service_worker": "js/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["main.js"],
      "run_at": "document_start",
      "all_frames": true,
      "match_about_blank": true,
      "match_origin_as_fallback": true
    }
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "permissions": [
    "scripting",
    "storage"
  ]
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/manifest.chrome.json src/manifest.edge.json src/manifest.firefox.json
git commit -m "feat: add per-browser manifest files"
```

---

### Task 2 : Retirer `src/manifest.json` du suivi git

**Files:**
- Modify: `.gitignore`
- Delete from tracking: `src/manifest.json`

- [ ] **Step 1 : Ajouter `src/manifest.json` au `.gitignore`**

Ajouter cette ligne à `.gitignore` :

```
src/manifest.json
```

- [ ] **Step 2 : Retirer `src/manifest.json` du suivi git sans supprimer le fichier local**

```bash
git rm --cached src/manifest.json
```

Résultat attendu :
```
rm 'src/manifest.json'
```

- [ ] **Step 3 : Vérifier que le fichier local existe toujours**

```bash
ls src/manifest.json
```

Résultat attendu : le fichier est toujours là localement.

- [ ] **Step 4 : Commit**

```bash
git add .gitignore
git commit -m "chore: untrack src/manifest.json, add to .gitignore"
```

---

### Task 3 : Créer le GitHub Action

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1 : Créer le répertoire `.github/workflows/`**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2 : Créer `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Build Chrome zip
        run: |
          cp src/manifest.chrome.json src/manifest.json
          zip -r "tab-wheel-scroll-chrome-${{ steps.version.outputs.version }}.zip" src/ \
            -x "src/manifest.chrome.json" \
            -x "src/manifest.edge.json" \
            -x "src/manifest.firefox.json"
          rm src/manifest.json

      - name: Build Edge zip
        run: |
          cp src/manifest.edge.json src/manifest.json
          zip -r "tab-wheel-scroll-edge-${{ steps.version.outputs.version }}.zip" src/ \
            -x "src/manifest.chrome.json" \
            -x "src/manifest.edge.json" \
            -x "src/manifest.firefox.json"
          rm src/manifest.json

      - name: Build Firefox zip
        run: |
          cp src/manifest.firefox.json src/manifest.json
          zip -r "tab-wheel-scroll-firefox-${{ steps.version.outputs.version }}.zip" src/ \
            -x "src/manifest.chrome.json" \
            -x "src/manifest.edge.json" \
            -x "src/manifest.firefox.json"
          rm src/manifest.json

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            tab-wheel-scroll-chrome-${{ steps.version.outputs.version }}.zip
            tab-wheel-scroll-edge-${{ steps.version.outputs.version }}.zip
            tab-wheel-scroll-firefox-${{ steps.version.outputs.version }}.zip
```

- [ ] **Step 3 : Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Action to build and release browser zips on tag"
```

---

### Task 4 : Vérification locale

Pas de framework de test dans ce projet — vérification manuelle.

- [ ] **Step 1 : Générer le manifest Chrome localement et vérifier le chargement**

```bash
cp src/manifest.chrome.json src/manifest.json
```

Aller dans `chrome://extensions/`, recharger l'extension, vérifier qu'elle fonctionne (Alt+wheel change d'onglet).

- [ ] **Step 2 : Vérifier le contenu d'un zip simulé**

```bash
cp src/manifest.chrome.json src/manifest.json
zip -r test-chrome.zip src/ \
  -x "src/manifest.chrome.json" \
  -x "src/manifest.edge.json" \
  -x "src/manifest.firefox.json"
unzip -l test-chrome.zip
rm test-chrome.zip src/manifest.json
```

Vérifier que la sortie contient `src/manifest.json` et **ne contient pas** `src/manifest.chrome.json`, `src/manifest.edge.json`, ni `src/manifest.firefox.json`.

- [ ] **Step 3 : Vérifier que `src/manifest.json` n'apparaît pas dans `git status`**

```bash
git status
```

Résultat attendu : `nothing to commit, working tree clean` (ou seulement le fichier local `manifest.json` listé comme untracked/ignored).

---

### Task 5 : Déclencher le premier release

- [ ] **Step 1 : Créer et pousser un tag**

```bash
git tag v3.0
git push origin v3.0
```

- [ ] **Step 2 : Vérifier le GitHub Action**

Aller dans l'onglet **Actions** du dépôt GitHub. Le workflow "Release" doit apparaître en cours d'exécution.

- [ ] **Step 3 : Vérifier les assets de la release**

Une fois le workflow terminé, aller dans **Releases** sur GitHub. La release `v3.0` doit avoir 3 fichiers attachés :
- `tab-wheel-scroll-chrome-3.0.zip`
- `tab-wheel-scroll-edge-3.0.zip`
- `tab-wheel-scroll-firefox-3.0.zip`
