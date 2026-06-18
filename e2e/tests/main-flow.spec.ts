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
