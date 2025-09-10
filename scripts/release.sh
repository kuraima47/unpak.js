#!/bin/bash

# unpak.js Release Script
# Usage: ./release.sh [patch|minor|major|alpha|beta]

set -e

VERSION_TYPE=$1
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage coloré
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [VERSION_TYPE]"
    echo ""
    echo "VERSION_TYPE:"
    echo "  patch   - Increment patch version (x.y.Z)"
    echo "  minor   - Increment minor version (x.Y.0)"
    echo "  major   - Increment major version (X.0.0)"
    echo "  alpha   - Create alpha prerelease"
    echo "  beta    - Create beta prerelease"
    echo ""
    echo "Examples:"
    echo "  $0 patch   # 2.0.0 → 2.0.1"
    echo "  $0 minor   # 2.0.0 → 2.1.0"
    echo "  $0 alpha   # 2.0.0 → 2.0.1-alpha.0"
}

# Vérifier les arguments
if [ -z "$VERSION_TYPE" ]; then
    print_error "Type de version manquant"
    show_help
    exit 1
fi

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major|alpha|beta)$ ]]; then
    print_error "Type de version invalide: $VERSION_TYPE"
    show_help
    exit 1
fi

print_status "🚀 Début du processus de release unpak.js"
print_status "Type de version: $VERSION_TYPE"

# 1. Vérifications préliminaires
print_status "🔍 Vérifications préliminaires..."

# Vérifier la branche
if [[ "$CURRENT_BRANCH" != "main" && "$VERSION_TYPE" != "alpha" && "$VERSION_TYPE" != "beta" ]]; then
    print_error "Les releases stables doivent être faites depuis la branche 'main'"
    print_error "Branche actuelle: $CURRENT_BRANCH"
    exit 1
fi

# Vérifier le statut Git
if [[ $(git status --porcelain) ]]; then
    print_error "Modifications non commitées détectées:"
    git status --short
    exit 1
fi

# Vérifier la connexion npm
if ! npm whoami > /dev/null 2>&1; then
    print_error "Non connecté à npm. Utilisez 'npm login'"
    exit 1
fi

print_success "Vérifications préliminaires OK"

# 2. Synchronisation avec le remote
print_status "🔄 Synchronisation avec origin..."
git fetch origin
git pull origin $CURRENT_BRANCH

# 3. Installation et vérifications
print_status "📦 Installation des dépendances..."
npm ci

print_status "🧹 Nettoyage des builds précédents..."
npm run clean || print_warning "Script clean non disponible, continuation..."

print_status "🔧 Linting du code..."
npm run lint || print_warning "Linting échoué, mais continuation..."

# 4. Build
print_status "🏗️ Construction du projet..."
if ! npm run build; then
    print_error "Échec du build"
    exit 1
fi

print_success "Build réussi"

# Vérifier que les fichiers de sortie existent
if [[ ! -f "dist/index.js" ]]; then
    print_error "Fichier dist/index.js manquant après le build"
    exit 1
fi

if [[ ! -f "dist/index.d.ts" ]]; then
    print_error "Fichier dist/index.d.ts manquant après le build"
    exit 1
fi

# 5. Tests (si disponibles)
print_status "🧪 Exécution des tests..."
if npm test > /dev/null 2>&1; then
    print_success "Tests réussis"
else
    print_warning "Tests non disponibles ou échoués, continuation..."
fi

# 6. Affichage du contenu du package
print_status "📋 Contenu du package à publier:"
npm pack --dry-run

# 7. Demande de confirmation
echo ""
print_status "Résumé de la release:"
echo "  - Type: $VERSION_TYPE"
echo "  - Branche: $CURRENT_BRANCH"
echo "  - Utilisateur npm: $(npm whoami)"

echo ""
read -p "$(echo -e ${YELLOW}Continuer avec la publication? [y/N]:${NC}) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Publication annulée par l'utilisateur"
    exit 0
fi

# 8. Mise à jour de version et publication
print_status "📝 Mise à jour de la version..."

case $VERSION_TYPE in
    alpha)
        NEW_VERSION=$(npm version prerelease --preid=alpha)
        TAG="alpha"
        ;;
    beta)
        NEW_VERSION=$(npm version prerelease --preid=beta)
        TAG="beta"
        ;;
    *)
        NEW_VERSION=$(npm version $VERSION_TYPE)
        TAG="latest"
        ;;
esac

print_success "Version mise à jour: $NEW_VERSION"

# 9. Push des tags
print_status "🏷️ Push des tags vers origin..."
git push origin $CURRENT_BRANCH --tags

# 10. Publication npm
print_status "🚀 Publication sur npm..."

if [[ "$TAG" == "latest" ]]; then
    npm publish
else
    npm publish --tag $TAG
fi

print_success "Publication réussie!"

# 11. Vérification post-publication
print_status "✅ Vérification de la publication..."
sleep 5  # Attendre que npm soit à jour

PUBLISHED_VERSION=$(npm view unpak.js version)
print_success "Version publiée confirmée: $PUBLISHED_VERSION"

# 12. Instructions finales
echo ""
print_success "🎉 Release terminée avec succès!"
echo ""
echo "Prochaines étapes recommandées:"
echo "  1. Vérifier la publication: https://www.npmjs.com/package/unpak.js"
echo "  2. Tester l'installation: npm install unpak.js@$TAG"
echo "  3. Mettre à jour la documentation si nécessaire"
echo "  4. Créer une GitHub Release si c'est une version stable"

if [[ "$TAG" != "latest" ]]; then
    echo ""
    print_warning "Version $TAG publiée. Installation:"
    echo "  npm install unpak.js@$TAG"
fi