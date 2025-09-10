# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Guide de packaging et release complet
- Scripts d'automatisation pour les releases
- Workflows GitHub Actions pour CI/CD
- Scripts NPM pour faciliter les releases

### Changed
- Configuration TypeScript mise à jour pour une meilleure compatibilité

## [2.0.0-alpha.1] - 2024-09-10

### Added
- Architecture TypeScript moderne inspirée de CUE4Parse
- Support pour PAK files et IoStore
- Gestion des clés de chiffrement
- API modulaire et extensible
- Documentation complète et guides de migration

### Changed
- Migration complète de JavaScript vers TypeScript
- Nouvelle API basée sur des promesses
- Structure modulaire améliorée

### Breaking Changes
- API complètement refactorisée depuis v1.x
- Nouvelles dépendances requises
- Migration nécessaire pour les utilisateurs existants

## [1.x.x] - Versions précédentes

Voir l'historique Git pour les versions 1.x.x.

---

## Format des Entrées

### Types de Changements
- `Added` : Nouvelles fonctionnalités
- `Changed` : Modifications de fonctionnalités existantes  
- `Deprecated` : Fonctionnalités bientôt supprimées
- `Removed` : Fonctionnalités supprimées
- `Fixed` : Corrections de bugs
- `Security` : Corrections de sécurité

### Breaking Changes
Les changements qui cassent la compatibilité sont documentés dans une section séparée.

### Format de Version
- `Major.Minor.Patch` pour les releases stables
- `Major.Minor.Patch-prerelease.number` pour les prereleases (alpha, beta, rc)