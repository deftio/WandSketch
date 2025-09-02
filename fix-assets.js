#!/usr/bin/env node
// Post-build script to rename assets to plain names for GitHub Pages

import fs from 'fs';
import path from 'path';

const distDir = './dist/public';
const assetsDir = path.join(distDir, 'assets');
const htmlFile = path.join(distDir, 'index.html');

console.log('🔧 Fixing asset names for GitHub Pages...');

// Read the current HTML
let html = fs.readFileSync(htmlFile, 'utf8');

// Find and rename the CSS file
const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
if (cssFiles.length > 0) {
  const oldCssName = cssFiles[0];
  const newCssName = 'wand-tracker.css';
  
  // Rename the file
  fs.renameSync(
    path.join(assetsDir, oldCssName),
    path.join(assetsDir, newCssName)
  );
  
  // Update HTML reference
  html = html.replace(
    new RegExp(`/assets/${oldCssName}`, 'g'),
    `/assets/${newCssName}`
  );
  
  console.log(`✅ Renamed ${oldCssName} → ${newCssName}`);
}

// Find and rename the JS file
const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
if (jsFiles.length > 0) {
  const oldJsName = jsFiles[0];
  const newJsName = 'wand-tracker.js';
  
  // Rename the file
  fs.renameSync(
    path.join(assetsDir, oldJsName),
    path.join(assetsDir, newJsName)
  );
  
  // Update HTML reference
  html = html.replace(
    new RegExp(`/assets/${oldJsName}`, 'g'),
    `/assets/${newJsName}`
  );
  
  console.log(`✅ Renamed ${oldJsName} → ${newJsName}`);
}

// Write the updated HTML
fs.writeFileSync(htmlFile, html);

console.log('🎉 Asset names fixed! Files now use plain names for GitHub Pages.');
console.log('📁 Current assets:');
fs.readdirSync(assetsDir).forEach(file => {
  console.log(`   - ${file}`);
});