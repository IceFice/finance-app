#!/usr/bin/env node
/**
 * Generates cryptographically secure secrets for JWT signing.
 * Usage: node scripts/generate-secrets.js [--write]
 *
 * --write  Appends the generated values to .env.development
 *          (only if the file exists and has placeholder values)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecret(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

const accessSecret = generateSecret(64);
const refreshSecret = generateSecret(64);

console.log('\n🔐  Generated JWT secrets\n');
console.log('Add these to your .env file:\n');
console.log(`JWT_ACCESS_SECRET=${accessSecret}`);
console.log(`JWT_REFRESH_SECRET=${refreshSecret}`);
console.log('');

// Verify they are different (astronomically unlikely to collide, but sanity check)
if (accessSecret === refreshSecret) {
  console.error('❌  Fatal: generated identical secrets — this should never happen. Run again.');
  process.exit(1);
}

// Verify minimum entropy
if (accessSecret.length < 64) {
  console.error('❌  Fatal: generated secret is too short.');
  process.exit(1);
}

if (process.argv.includes('--write')) {
  const envPath = path.join(__dirname, '..', '.env.development');

  if (!fs.existsSync(envPath)) {
    console.warn('⚠️   .env.development not found — create it from .env.example first.');
    console.warn('    Then run this script again with --write.\n');
    process.exit(0);
  }

  let content = fs.readFileSync(envPath, 'utf8');
  let changed = 0;

  if (content.includes('PASTE_GENERATED_SECRET_HERE')) {
    content = content.replace('PASTE_GENERATED_SECRET_HERE', accessSecret);
    changed++;
  } else if (content.match(/JWT_ACCESS_SECRET=REPLACE.*|JWT_ACCESS_SECRET=$/m)) {
    content = content.replace(
      /JWT_ACCESS_SECRET=.*/,
      `JWT_ACCESS_SECRET=${accessSecret}`
    );
    changed++;
  }

  if (content.includes('PASTE_DIFFERENT_GENERATED_SECRET_HERE')) {
    content = content.replace('PASTE_DIFFERENT_GENERATED_SECRET_HERE', refreshSecret);
    changed++;
  } else if (content.match(/JWT_REFRESH_SECRET=REPLACE.*|JWT_REFRESH_SECRET=$/m)) {
    content = content.replace(
      /JWT_REFRESH_SECRET=.*/,
      `JWT_REFRESH_SECRET=${refreshSecret}`
    );
    changed++;
  }

  if (changed > 0) {
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`✅  Wrote ${changed} secret(s) to .env.development\n`);
  } else {
    console.log('ℹ️   .env.development already has non-placeholder secrets. No changes made.');
    console.log('    To replace them, manually update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.\n');
  }
}

console.log('Security reminders:');
console.log('  • Use separate secrets for development, staging, and production');
console.log('  • Never commit real secrets to version control');
console.log('  • Store production secrets in your platform secret manager');
console.log('  • Rotate secrets immediately if they are ever exposed\n');
