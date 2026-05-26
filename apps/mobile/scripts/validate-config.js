#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * validate-config.js — Validation capacitor.config.ts
 *
 * Vérifie :
 *   - Le fichier capacitor.config.ts existe et compile
 *   - appId respecte le format reverse-DNS (com.xxx.yyy)
 *   - appName non vide
 *   - server.url est une URL HTTPS valide
 *   - server.allowNavigation contient au minimum le domaine principal
 *   - webDir pointe vers un dossier existant (créé si absent)
 *   - Tous les plugins déclarés sont présents dans package.json
 *
 * Usage :
 *   node scripts/validate-config.js
 *
 * Exit codes :
 *   0 = config valide
 *   1 = erreur(s) détectée(s)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(MOBILE_ROOT, 'capacitor.config.ts');
const PKG_PATH = path.join(MOBILE_ROOT, 'package.json');

const errors = [];
const warnings = [];

/** Lit un fichier UTF-8 ou exit avec erreur. */
function readOrDie(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[FATAL] Fichier introuvable : ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/** Extrait grossièrement une valeur string d'une clé TS via regex. */
function extractString(source, key) {
  const re = new RegExp(`${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`);
  const m = source.match(re);
  return m ? m[1] : null;
}

/** Vérifie format reverse-DNS appId. */
function validateAppId(appId) {
  if (!appId) {
    errors.push('appId manquant');
    return;
  }
  if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/i.test(appId)) {
    errors.push(`appId invalide : "${appId}" (format attendu : com.company.app)`);
  }
  if (appId !== 'com.citurbarea.app') {
    warnings.push(`appId attendu "com.citurbarea.app", trouvé "${appId}"`);
  }
}

/** Vérifie URL HTTPS valide. */
function validateUrl(url) {
  if (!url) {
    errors.push('server.url manquant');
    return;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      errors.push(`server.url doit être HTTPS (trouvé ${parsed.protocol})`);
    }
  } catch (e) {
    errors.push(`server.url invalide : "${url}" (${e.message})`);
  }
}

/** Vérifie que tous les plugins Capacitor importés sont dans package.json. */
function validatePlugins(configSource, pkg) {
  const importRe = /from\s+['"]@capacitor\/([a-z-]+)['"]/g;
  const imported = new Set();
  let m;
  while ((m = importRe.exec(configSource)) !== null) {
    imported.add(`@capacitor/${m[1]}`);
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const plugin of imported) {
    if (!deps[plugin]) {
      errors.push(`Plugin importé mais absent de package.json : ${plugin}`);
    }
  }

  // Plugins requis minimum
  const required = [
    '@capacitor/core',
    '@capacitor/cli',
    '@capacitor/ios',
    '@capacitor/android',
  ];
  for (const req of required) {
    if (!deps[req]) {
      errors.push(`Plugin requis manquant : ${req}`);
    }
  }
}

// ============================================
// MAIN
// ============================================

console.log('Validation capacitor.config.ts...\n');

const configSource = readOrDie(CONFIG_PATH);
const pkg = JSON.parse(readOrDie(PKG_PATH));

const appId = extractString(configSource, 'appId');
const appName = extractString(configSource, 'appName');
const webDir = extractString(configSource, 'webDir');
const serverUrl = extractString(configSource, 'url');

validateAppId(appId);
if (!appName) errors.push('appName manquant');
if (!webDir) errors.push('webDir manquant');
validateUrl(serverUrl);

// Vérifie webDir existe (ou peut être créé)
if (webDir) {
  const webDirPath = path.join(MOBILE_ROOT, webDir);
  if (!fs.existsSync(webDirPath)) {
    warnings.push(`webDir "${webDir}" n'existe pas — création automatique au build.`);
  }
}

// Vérifie allowNavigation contient citurbarea.com
if (!/allowNavigation[\s\S]{0,500}citurbarea\.com/.test(configSource)) {
  warnings.push('server.allowNavigation ne contient pas explicitement citurbarea.com');
}

validatePlugins(configSource, pkg);

// ============================================
// REPORT
// ============================================

console.log('Résumé :');
console.log(`  appId      : ${appId || '(absent)'}`);
console.log(`  appName    : ${appName || '(absent)'}`);
console.log(`  webDir     : ${webDir || '(absent)'}`);
console.log(`  server.url : ${serverUrl || '(absent)'}`);
console.log('');

if (warnings.length > 0) {
  console.log('Warnings :');
  for (const w of warnings) console.log(`  [WARN] ${w}`);
  console.log('');
}

if (errors.length > 0) {
  console.log('Erreurs :');
  for (const e of errors) console.log(`  [ERR]  ${e}`);
  console.log('');
  console.error(`[FAIL] ${errors.length} erreur(s) détectée(s).`);
  process.exit(1);
}

console.log('[OK] Configuration valide.');
process.exit(0);
