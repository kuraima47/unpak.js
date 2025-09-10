# Guide de Packaging et Release - unpak.js

Ce document décrit la procédure complète pour packager et publier la librairie unpak.js sur npm afin qu'elle puisse être utilisée comme dépendance dans d'autres projets.

## 📋 Table des Matières

- [Prérequis](#prérequis)
- [Préparation de l'environnement](#préparation-de-lenvironnement)
- [Procédure de Release](#procédure-de-release)
- [Publication sur npm](#publication-sur-npm)
- [Gestion des Versions](#gestion-des-versions)
- [Workflow de Développement](#workflow-de-développement)
- [CI/CD et Automatisation](#cicd-et-automatisation)
- [Vérification Post-Publication](#vérification-post-publication)
- [Dépannage](#dépannage)

## 🔧 Prérequis

### Outils Requis

- **Node.js**: 18.0+ (LTS recommandé)
- **npm**: 8.0+ (inclus avec Node.js)
- **Git**: Pour la gestion de version
- **Compte npm**: Pour publier sur le registry npm

### Configuration Initiale

1. **Vérifier Node.js et npm**:
```bash
node --version  # Doit être >= 18.0.0
npm --version   # Doit être >= 8.0.0
```

2. **Connexion npm**:
```bash
npm login
# Entrer vos identifiants npm
npm whoami  # Vérifier la connexion
```

3. **Configuration Git**:
```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

## 🚀 Préparation de l'Environnement

### 1. Cloner et Configurer le Projet

```bash
# Cloner le repository
git clone https://github.com/kuraima47/unpak.js.git
cd unpak.js

# Installer les dépendances
npm install

# Vérifier la configuration
npm run lint        # Vérifier le style de code
```

### 2. Configuration TypeScript

Le projet utilise TypeScript avec la configuration suivante dans `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 3. Vérification des Fichiers de Configuration

**package.json** - Points clés à vérifier:
```json
{
  "name": "unpak.js",
  "version": "2.0.0-alpha.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run clean && npm run build"
  }
}
```

**.npmignore** - Fichiers exclus du package npm:
```
src/
docs/
tests/
.github/
node_modules/
*.log
.env
```

## 📦 Procédure de Release

### 1. Préparation de la Release

#### A. Vérification de l'État du Code

```bash
# Vérifier qu'il n'y a pas de modifications non commitées
git status

# Vérifier que toutes les branches sont synchronisées
git pull origin main

# Vérifier les tests (si disponibles)
npm test

# Vérifier le linting
npm run lint
```

#### B. Construction et Test

```bash
# Nettoyer les builds précédents
npm run clean

# Construire le projet
npm run build

# Vérifier que le build a réussi
ls -la dist/
# Doit contenir: index.js, index.d.ts, et les fichiers source maps
```

#### C. Test Local du Package

```bash
# Créer un package local pour tester
npm pack

# Cela crée un fichier .tgz que vous pouvez tester
# dans un autre projet avec: npm install /path/to/unpak.js-x.x.x.tgz
```

### 2. Gestion des Versions

#### A. Types de Versions

- **Major** (x.0.0): Breaking changes
- **Minor** (x.y.0): Nouvelles fonctionnalités (compatibles)
- **Patch** (x.y.z): Corrections de bugs
- **Prerelease**: alpha, beta, rc (ex: 2.0.0-alpha.1)

#### B. Mise à Jour de Version

```bash
# Pour une version patch (2.0.0 → 2.0.1)
npm version patch

# Pour une version minor (2.0.0 → 2.1.0)
npm version minor

# Pour une version major (2.0.0 → 3.0.0)
npm version major

# Pour une prerelease (2.0.0 → 2.0.1-alpha.0)
npm version prerelease --preid=alpha
```

La commande `npm version` met automatiquement à jour le `package.json` et crée un commit Git avec tag.

### 3. Documentation de Release

#### A. Mise à Jour du CHANGELOG

Créer/mettre à jour `CHANGELOG.md`:

```markdown
# Changelog

## [2.0.0-alpha.2] - 2024-XX-XX

### Added
- Nouvelle fonctionnalité X
- Support pour Y

### Changed
- Amélioration de la performance Z

### Fixed
- Correction du bug A
- Résolution du problème B

### Breaking Changes
- API X a été modifiée
```

#### B. Mise à Jour de la Documentation

```bash
# Vérifier que README.md est à jour
# Mettre à jour les exemples d'installation si la version change
# S'assurer que la documentation API est synchronisée
```

## 📤 Publication sur npm

### 1. Publication Standard

```bash
# Publier la version actuelle
npm publish

# Pour une version prerelease (alpha, beta)
npm publish --tag alpha
npm publish --tag beta
```

### 2. Publication avec Vérifications

```bash
# Script complet de publication sécurisée
#!/bin/bash

echo "🔍 Vérifications pré-publication..."

# Vérifier le statut Git
if [[ $(git status --porcelain) ]]; then
    echo "❌ Modifications non commitées détectées"
    exit 1
fi

# Vérifier la branche
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
    echo "❌ Doit être sur la branche main pour publier"
    exit 1
fi

# Build et test
echo "🏗️ Construction..."
npm run build

echo "🧪 Tests..."
npm test || echo "⚠️ Tests non disponibles"

# Vérifier le contenu du package
echo "📦 Contenu du package:"
npm pack --dry-run

# Demander confirmation
read -p "Publier maintenant? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Publication..."
    npm publish
    echo "✅ Publication réussie!"
else
    echo "❌ Publication annulée"
fi
```

### 3. Publication de Versions Spéciales

#### Alpha/Beta Releases
```bash
# Publier une version alpha
npm version prerelease --preid=alpha
npm publish --tag alpha

# Installation côté utilisateur
npm install unpak.js@alpha
```

#### Dry Run (Test sans publication)
```bash
# Simuler la publication sans réellement publier
npm publish --dry-run
```

## 🏷️ Gestion des Versions

### 1. Stratégie de Versioning

Le projet suit [Semantic Versioning (SemVer)](https://semver.org/):

- **2.0.0**: Version stable actuelle
- **2.0.0-alpha.x**: Versions de développement
- **2.1.0**: Prochaine version avec nouvelles fonctionnalités
- **3.0.0**: Future version avec breaking changes

### 2. Tags npm

```bash
# Publier avec tags spécifiques
npm publish --tag latest    # Version stable (défaut)
npm publish --tag alpha     # Version alpha
npm publish --tag beta      # Version beta
npm publish --tag next      # Prochaine version majeure

# Gérer les tags
npm dist-tag add unpak.js@2.0.0-alpha.1 alpha
npm dist-tag ls unpak.js
```

### 3. Migration entre Versions

Pour aider les utilisateurs, maintenir:
- `docs/MIGRATION.md`: Guide de migration
- Notes de release détaillées
- Exemples de code mis à jour

## 🔄 Workflow de Développement

### 1. Git Flow Recommandé

```bash
# 1. Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer et tester
# ... développement ...
npm run build
npm test

# 3. Commit et push
git add .
git commit -m "feat: ajouter nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# 4. Créer une Pull Request
# 5. Merger dans main après review
# 6. Publier une nouvelle version
```

### 2. Scripts NPM Utiles

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch", 
    "clean": "rimraf dist",
    "prepublishOnly": "npm run clean && npm run build",
    "release:patch": "npm version patch && npm publish",
    "release:minor": "npm version minor && npm publish",
    "release:major": "npm version major && npm publish",
    "release:alpha": "npm version prerelease --preid=alpha && npm publish --tag alpha"
  }
}
```

### 3. Bonnes Pratiques

- **Toujours tester** avant de publier
- **Documenter** les breaking changes
- **Utiliser des commits conventionnels** (feat:, fix:, docs:, etc.)
- **Taguer les releases** importantes
- **Maintenir un CHANGELOG** à jour

## 🤖 CI/CD et Automatisation

### 1. GitHub Actions pour Publication Automatique

Créer `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Test
        run: npm test
        
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2. Configuration des Secrets GitHub

1. Aller dans Settings → Secrets and variables → Actions
2. Ajouter `NPM_TOKEN` avec votre token npm

### 3. Automatisation des Releases

```bash
# Script pour automatiser les releases
#!/bin/bash

VERSION_TYPE=$1

if [ -z "$VERSION_TYPE" ]; then
    echo "Usage: ./release.sh [patch|minor|major|alpha]"
    exit 1
fi

case $VERSION_TYPE in
    alpha)
        npm version prerelease --preid=alpha
        git push origin main --tags
        npm publish --tag alpha
        ;;
    *)
        npm version $VERSION_TYPE
        git push origin main --tags
        npm publish
        ;;
esac
```

## ✅ Vérification Post-Publication

### 1. Vérifier la Publication

```bash
# Vérifier que le package est publié
npm view unpak.js

# Vérifier les versions disponibles
npm view unpak.js versions --json

# Vérifier les tags
npm view unpak.js dist-tags
```

### 2. Test d'Installation

```bash
# Dans un nouveau répertoire
mkdir test-install
cd test-install
npm init -y

# Installer votre package
npm install unpak.js

# Tester l'import
node -e "
const unpak = require('unpak.js');
console.log('✅ Import réussi');
console.log('Version:', require('unpak.js/package.json').version);
"
```

### 3. Documentation de l'Installation

Mettre à jour le README.md avec:

```markdown
## Installation

### Via npm
```bash
npm install unpak.js
```

### Via yarn
```bash
yarn add unpak.js
```

## Usage

```typescript
import { openPakArchive, createKeyManager } from 'unpak.js';

const keyManager = createKeyManager();
const archive = await openPakArchive('./game.pak', keyManager);
```

## 🔧 Dépannage

### Problèmes Courants

#### 1. Erreur de Build TypeScript

```bash
# Problème: Types Node.js non trouvés
# Solution: Vérifier tsconfig.json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

#### 2. Erreur de Publication npm

```bash
# Problème: 403 Forbidden
# Solution: Vérifier les permissions npm
npm whoami
npm owner ls unpak.js
```

#### 3. Package Trop Volumineux

```bash
# Vérifier la taille du package
npm pack --dry-run

# Optimiser en excluant des fichiers
# Mettre à jour .npmignore
```

#### 4. Versions Conflictuelles

```bash
# Problème: Version déjà publiée
# Solution: Incrémenter la version
npm version patch
npm publish
```

### Contacts et Support

- **Repository**: https://github.com/kuraima47/unpak.js
- **Issues**: https://github.com/kuraima47/unpak.js/issues
- **npm Package**: https://www.npmjs.com/package/unpak.js

---

Ce guide assure une publication professionnelle et fiable de la librairie unpak.js sur npm, permettant son utilisation facile par la communauté de développeurs.