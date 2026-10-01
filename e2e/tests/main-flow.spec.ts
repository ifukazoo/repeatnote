import { test, expect } from '@playwright/test';
import { ChildProcess, spawn } from 'node:child_process';
import { startMockObsidian, stopMockObsidian, clearFiles } from '../mock-obsidian';

const MOCK_OBSIDIAN_PORT = 3097;
const APP_PORT = 3098;

let appProcess: ChildProcess;

test.beforeAll(async () => {
  await startMockObsidian(MOCK_OBSIDIAN_PORT);

  appProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: new URL('../../server', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      OBSIDIAN_BASE_URL: `http://127.0.0.1:${MOCK_OBSIDIAN_PORT}`,
      OBSIDIAN_API_KEY: 'test-key',
      OBSIDIAN_VAULT_FOLDER: 'repeatnote',
    },
    stdio: 'pipe',
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10_000);
    appProcess.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('running on')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    appProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
});

test.afterAll(async () => {
  appProcess?.kill();
  await stopMockObsidian();
});

test.beforeEach(() => {
  clearFiles();
});

test.describe('メインフロー', () => {
  test('アイテムを作成できる', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /RepeatNote/ })).toBeVisible();

    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('テスト用の学習項目');
    await page.getByRole('button', { name: '追加' }).click();

    await expect(page.getByText('テスト用の学習項目')).toBeVisible();
  });

  test('アイテムを復習できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('復習テスト項目');
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('復習テスト項目')).toBeVisible();

    await page.getByRole('button', { name: /完璧/ }).click();

    await expect(page.getByText('復習が必要な項目はありません')).toBeVisible();

    await page.getByRole('button', { name: 'すべて表示' }).click();
    await expect(page.getByText('復習回数: 1')).toBeVisible();
  });

  test('アイテムをマスターできる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('マスターテスト項目');
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('マスターテスト項目')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /覚えた/ }).click();

    await expect(page.getByText('復習が必要な項目はありません')).toBeVisible();

    await page.getByRole('button', { name: 'すべて表示' }).click();
    await expect(page.getByText('マスターテスト項目')).toBeVisible();
    await expect(page.getByText('覚えた項目')).toBeVisible();
  });

  test('HTML を添付して artifact を開ける（artifact の JS から API に書き込めない）', async ({
    page,
  }) => {
    // JS が動けば本文を書き換え、API への書き込みを試みて結果のステータスを表示する
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>E2Eクイズ</title></head>
<body><p id="msg">初期表示</p><p id="api">未実行</p><script>
document.getElementById('msg').textContent = 'JS 実行OK';
fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ content: '侵入テスト' }) })
  .then((r) => { document.getElementById('api').textContent = 'status:' + r.status; })
  .catch(() => { document.getElementById('api').textContent = 'blocked'; });
</script></body></html>`;

    await page.goto('/');
    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('artifact テスト項目');
    await page.getByLabel(/HTML を添付/).setInputFiles({
      name: 'quiz.html',
      mimeType: 'text/html',
      buffer: Buffer.from(html),
    });
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('artifact テスト項目')).toBeVisible();

    await page.getByRole('button', { name: /artifact を開く/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('🧩 E2Eクイズ')).toBeVisible();

    const frame = page.frameLocator('iframe');
    await expect(frame.locator('#msg')).toHaveText('JS 実行OK');
    await expect(frame.locator('#api')).toHaveText(/status:403|blocked/);

    await dialog.getByRole('button', { name: '閉じる' }).click();
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'すべて表示' }).click();
    await expect(page.getByText('artifact テスト項目')).toBeVisible();
    await expect(page.getByText('侵入テスト')).not.toBeVisible();
  });

  test('HTML 欄にファイルをドラッグ&ドロップして添付できる', async ({ page }) => {
    const html =
      '<!doctype html><html><head><meta charset="utf-8"><title>D&Dテスト</title></head><body><p>dropped</p></body></html>';

    await page.goto('/');
    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('ドロップ テスト項目');

    // 合成した DataTransfer を持つドラッグイベントを添付欄に送る
    const dataTransfer = await page.evaluateHandle((content) => {
      const dt = new DataTransfer();
      dt.items.add(new File([content], 'dropped.html', { type: 'text/html' }));
      return dt;
    }, html);
    const dropTarget = page.locator('.attachment-drop-target', { hasText: 'HTML を添付' });
    await dropTarget.dispatchEvent('dragenter', { dataTransfer });
    await expect(dropTarget).toHaveClass(/is-dragging/);
    await dropTarget.dispatchEvent('dragover', { dataTransfer });
    await dropTarget.dispatchEvent('drop', { dataTransfer });
    await expect(dropTarget).not.toHaveClass(/is-dragging/);
    await expect(page.getByText('選択済み: dropped.html')).toBeVisible();

    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('ドロップ テスト項目')).toBeVisible();

    await page.getByRole('button', { name: /artifact を開く/ }).click();
    await expect(page.getByRole('dialog').getByText('🧩 D&Dテスト')).toBeVisible();
    await expect(page.frameLocator('iframe').getByText('dropped')).toBeVisible();
  });

  test('アイテムを削除できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '新しいアイテムを追加' }).click();
    await page.getByPlaceholder('学習内容を入力').fill('削除テスト項目');
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('削除テスト項目')).toBeVisible();

    await page.getByRole('button', { name: '⌄' }).click();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '削除' }).click();

    await expect(page.getByText('削除テスト項目')).not.toBeVisible();
  });
});
