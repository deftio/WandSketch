#!/bin/bash
# Ultra-fast GitHub Pages deployment script

echo "🚀 Fast GitHub Pages Deployment"
echo "================================"

# Clean and rebuild
echo "🧹 Cleaning old build..."
rm -rf dist/

echo "🔨 Building app..."
npm run build

echo "🔧 Fixing asset names..."
node fix-assets.js

echo "📊 Build summary:"
echo "  - HTML: $(ls -la dist/public/index.html | awk '{print $5}') bytes"
echo "  - CSS:  $(ls -la dist/public/assets/*.css | awk '{print $5}') bytes" 
echo "  - JS:   $(ls -la dist/public/assets/*.js | awk '{print $5}') bytes"
echo "  - Favicon: $(ls -la dist/public/favicon.svg | awk '{print $5}') bytes"

echo ""
echo "📁 Copying files to repository root for GitHub Pages..."
cp -r dist/public/* .

echo "✅ Files copied to root - GitHub Pages can now find them!"
echo "📋 Ready for git commit and push!"
echo "💡 This should deploy in under 2 minutes with the new workflow."