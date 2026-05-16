#!/usr/bin/env node
/**
 * Migrate image_filename from frontmatter to note body as ![[filename]].
 * Run with --dry-run to preview changes without writing files.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const VAULT_PATH = '/Users/ki/Obsidian/MyVault/repeatnote';
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('=== DRY RUN MODE (no files will be changed) ===\n');
}

function removeFrontmatterKey(frontmatter, key) {
  return frontmatter
    .split('\n')
    .filter((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return true;
      return line.slice(0, colonIndex).trim() !== key;
    })
    .join('\n')
    .trimEnd();
}

const files = readdirSync(VAULT_PATH).filter((f) => f.endsWith('.md'));
let migrated = 0;
let skipped = 0;

for (const filename of files) {
  const filePath = join(VAULT_PATH, filename);
  const content = readFileSync(filePath, 'utf-8');

  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    console.log(`SKIP (no frontmatter): ${filename}`);
    skipped++;
    continue;
  }

  const frontmatter = match[1];
  const body = match[2];

  const imageFilenameMatch = frontmatter.match(/^image_filename: (.*)$/m);
  if (!imageFilenameMatch) {
    skipped++;
    continue;
  }

  const imageFilename = imageFilenameMatch[1].trim();
  const newFrontmatter = removeFrontmatterKey(frontmatter, 'image_filename');
  const trimmedBody = body.trim();

  let newBody;
  if (imageFilename) {
    newBody = trimmedBody
      ? `${trimmedBody}\n\n![[${imageFilename}]]`
      : `![[${imageFilename}]]`;
  } else {
    newBody = trimmedBody;
  }

  const newContent = `---\n${newFrontmatter}\n---\n\n${newBody}\n`;

  if (DRY_RUN) {
    console.log(
      `MIGRATE: ${filename}${imageFilename ? ` → ![[${imageFilename}]]` : ' (no image)'}`,
    );
  } else {
    writeFileSync(filePath, newContent, 'utf-8');
    console.log(
      `MIGRATED: ${filename}${imageFilename ? ` → ![[${imageFilename}]]` : ' (no image)'}`,
    );
  }
  migrated++;
}

console.log(`\nTotal: ${migrated} files to migrate, ${skipped} files skipped`);
