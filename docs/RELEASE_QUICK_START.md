# Guide Rapide de Release - unpak.js

Ce document fournit un résumé rapide des commandes pour publier une nouvelle version d'unpak.js.

## 🚀 Commandes Rapides

### Releases Standard

```bash
# Correction de bug (2.0.0 → 2.0.1)
npm run release:patch

# Nouvelle fonctionnalité (2.0.0 → 2.1.0)  
npm run release:minor

# Breaking change (2.0.0 → 3.0.0)
npm run release:major
```

### Releases de Développement

```bash
# Version alpha (2.0.0 → 2.0.1-alpha.0)
npm run release:alpha

# Version beta (2.0.0 → 2.0.1-beta.0)
npm run release:beta
```

### Vérifications

```bash
# Vérifier le contenu du package
npm run package:check

# Tester le package localement
npm run package:test

# Voir les versions publiées
npm run version:check
```

## 📋 Checklist Pré-Release

- [ ] Code committé et pushé
- [ ] Sur la branche `main` (pour releases stables)
- [ ] Tests passent (`npm test`)
- [ ] Build réussit (`npm run build`)
- [ ] Linting OK (`npm run lint`)
- [ ] CHANGELOG.md mis à jour
- [ ] Documentation à jour

## 🔧 Installation des Versions

```bash
# Version stable
npm install unpak.js

# Version alpha
npm install unpak.js@alpha

# Version beta  
npm install unpak.js@beta

# Version spécifique
npm install unpak.js@2.0.0-alpha.1
```

## 📖 Documentation Complète

Pour plus de détails, voir [PACKAGING_AND_RELEASE.md](./PACKAGING_AND_RELEASE.md).