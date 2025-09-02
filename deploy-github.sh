#!/bin/bash
# GitHub Pages Deployment Script - Handles caching issues

echo "🚀 Preparing GitHub Pages deployment..."

# Clean old build files completely
echo "🧹 Cleaning old build files..."
rm -rf dist/public

# Rebuild everything fresh
echo "🔨 Building fresh assets..."
npm run build

# Show what was built
echo "📁 Built files:"
ls -la dist/public/assets/

# Show HTML references
echo "🔗 HTML asset references:"
grep -E "(assets/.*\.(js|css))" dist/public/index.html

echo "✅ Build complete! Ready for git commit and push."
echo ""
echo "Next steps:"
echo "1. git add ."
echo "2. git commit -m 'Fresh build for GitHub Pages'"
echo "3. git push"
echo ""
echo "💡 This ensures GitHub Pages gets completely fresh files without caching conflicts."