#!/usr/bin/env node
/**
 * Cloudflare D1 / R2 → Obsidian vault 移行スクリプト
 *
 * 使い方:
 *   node scripts/migrate-from-cloudflare.mjs            # 本番実行
 *   node scripts/migrate-from-cloudflare.mjs --dry-run  # ドライラン（ファイル作成なし）
 *
 * 前提条件:
 *   - wrangler がインストール済み（npm run deploy が動く環境）
 *   - `wrangler login` または CLOUDFLARE_API_TOKEN が設定済み
 *   - Obsidian vault が存在する
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ========== 設定 ==========
const VAULT_PATH = '/Users/ki/Obsidian/MyVault/repeatnote';
const ATTACHMENTS_PATH = join(VAULT_PATH, 'attachments');
const WORKER_URL = 'https://repeatnote.ifukazoo.workers.dev';
const D1_DB_NAME = 'repeatnote-db';
const DRY_RUN = process.argv.includes('--dry-run');
// ==========================

/** D1 の Item レコード型 */
/** @typedef {{
 *   id: number,
 *   content: string,
 *   image_url: string|null,
 *   image_filename: string|null,
 *   created_at: string,
 *   next_review: string|null,
 *   interval_days: number,
 *   ease_factor: number,
 *   review_count: number,
 *   mastered: number|boolean
 * }} D1Item
 */

/** D1 の next_review は ISO 文字列（例: 2026-05-09T10:00:00.000Z）
 *  parser は YYYY-MM-DD を期待するので変換する */
function toDateStr(isoOrDate) {
  if (!isoOrDate) return '';
  return isoOrDate.split('T')[0];
}

/** ObsidianItem → Frontmatter 付き Markdown 文字列 */
function itemToMarkdown({ created_at, interval_days, ease_factor, review_count, next_review, mastered, image_filename, content }) {
  const ef = Math.round(ease_factor * 100) / 100;
  return [
    '---',
    `created_at: ${created_at}`,
    `interval_days: ${interval_days}`,
    `ease_factor: ${ef}`,
    `review_count: ${review_count}`,
    `next_review: ${next_review ?? ''}`,
    `mastered: ${Boolean(mastered)}`,
    `image_filename: ${image_filename ?? ''}`,
    '---',
    '',
    content,
  ].join('\n');
}

/** D1 から全アイテムを取得する */
function fetchD1Items() {
  console.log('D1 データベースからアイテムを取得中...');
  let stdout;
  try {
    stdout = execSync(
      `npx wrangler d1 execute ${D1_DB_NAME} --remote --json --command="SELECT * FROM items ORDER BY id ASC"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
  } catch (err) {
    // wrangler が stderr にエラーを出す場合があるので stdout だけ見る
    stdout = err.stdout ?? '';
    if (!stdout.trim()) {
      console.error('D1 クエリに失敗しました:');
      console.error(err.stderr ?? err.message);
      process.exit(1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    console.error('D1 出力の JSON パースに失敗しました:');
    console.error(stdout.substring(0, 500));
    process.exit(1);
  }

  return parsed[0]?.results ?? [];
}

/** R2 から画像をダウンロードして保存する */
async function downloadImage(filename, destPath) {
  const url = `${WORKER_URL}/api/images/${encodeURIComponent(filename)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!DRY_RUN) {
    writeFileSync(destPath, buffer);
  }
}

async function main() {
  console.log(`\n${'='.repeat(50)}`);
  console.log('RepeatNote 移行スクリプト: Cloudflare → Obsidian');
  console.log(`${'='.repeat(50)}`);
  if (DRY_RUN) {
    console.log('【ドライランモード】実際のファイルは作成されません\n');
  }

  const items = fetchD1Items();
  console.log(`${items.length} 件のアイテムを取得しました\n`);

  if (items.length === 0) {
    console.log('移行するアイテムがありません。');
    return;
  }

  // vault ディレクトリを作成
  if (!DRY_RUN) {
    mkdirSync(VAULT_PATH, { recursive: true });
    mkdirSync(ATTACHMENTS_PATH, { recursive: true });
    console.log(`vault ディレクトリを作成: ${VAULT_PATH}`);
    console.log(`attachments ディレクトリを作成: ${ATTACHMENTS_PATH}\n`);
  }

  let successCount = 0;
  let imageSuccess = 0;
  let imageFail = 0;

  for (const item of items) {
    const uuid = crypto.randomUUID();
    const mdFilename = `${uuid}.md`;
    const mdPath = join(VAULT_PATH, mdFilename);

    const preview = item.content.length > 50
      ? item.content.substring(0, 50) + '...'
      : item.content;
    console.log(`[D1 ID: ${item.id}] ${preview}`);
    console.log(`  UUID: ${uuid}`);

    const markdown = itemToMarkdown({
      created_at: item.created_at,
      interval_days: item.interval_days,
      ease_factor: item.ease_factor,
      review_count: item.review_count,
      next_review: toDateStr(item.next_review),
      mastered: item.mastered,
      image_filename: item.image_filename,
      content: item.content,
    });

    if (!DRY_RUN) {
      writeFileSync(mdPath, markdown, 'utf-8');
    }
    console.log(`  .md: ${mdPath}${DRY_RUN ? ' [SKIP]' : ' ✅'}`);

    if (item.image_filename) {
      const imageDest = join(ATTACHMENTS_PATH, item.image_filename);
      try {
        await downloadImage(item.image_filename, imageDest);
        console.log(`  画像: ${item.image_filename} → ${imageDest}${DRY_RUN ? ' [SKIP]' : ' ✅'}`);
        imageSuccess++;
      } catch (e) {
        console.error(`  画像: ${item.image_filename} ⚠️ ダウンロード失敗: ${e.message}`);
        imageFail++;
      }
    }

    successCount++;
    console.log('');
  }

  console.log(`${'='.repeat(50)}`);
  console.log(`移行結果:`);
  console.log(`  アイテム: ${successCount} / ${items.length} 件`);
  if (imageSuccess + imageFail > 0) {
    console.log(`  画像:     ${imageSuccess} 件成功 / ${imageFail} 件失敗`);
  }
  if (DRY_RUN) {
    console.log('\n（ドライランのため実際のファイルは作成されていません）');
    console.log('本番実行するには --dry-run を外して再実行してください。');
  }
  console.log(`${'='.repeat(50)}\n`);
}

main().catch((e) => {
  console.error('予期しないエラーが発生しました:', e);
  process.exit(1);
});
