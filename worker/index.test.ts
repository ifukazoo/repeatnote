// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './index';
import { createItem } from './database';

// 各フォーマットの最小マジックバイト
const MAGIC = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
  gif: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  fake: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
};

vi.mock('./database', () => ({
  getItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  reviewItem: vi.fn(),
  masterItem: vi.fn(),
  unmasterItem: vi.fn(),
}));

const mockCreateItem = vi.mocked(createItem);

const mockItem = {
  id: 1,
  content: 'テスト項目',
  image_url: null,
  image_filename: null,
  created_at: '2026-01-01T00:00:00.000Z',
  next_review: '2026-01-01T00:00:00.000Z',
  interval_days: 1,
  ease_factor: 2.5,
  review_count: 0,
  mastered: false,
};

function makeCtx(): ExecutionContext {
  return { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} };
}

function makeEnv(): Env {
  return {
    DB: {} as D1Database,
    IMAGES: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      delete: vi.fn(),
    } as unknown as R2Bucket,
  };
}

const BASE_URL = 'https://repeatnote.example.com';

describe('POST /api/items', () => {
  beforeEach(() => {
    mockCreateItem.mockResolvedValue(mockItem);
  });

  describe('JSON形式', () => {
    it('contentで201とアイテムを返す', async () => {
      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'テスト項目' }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(201);
    });

    it('contentが空の場合は400を返す', async () => {
      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Content is required');
    });

    it('contentが1001文字超の場合は400を返す', async () => {
      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'a'.repeat(1001) }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Content too long (max 1000 characters)');
    });
  });

  describe('FormData形式', () => {
    it('contentのみで201を返す', async () => {
      const formData = new FormData();
      formData.append('content', 'テスト項目');

      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(201);
    });

    it('contentが空の場合は400を返す', async () => {
      const formData = new FormData();
      formData.append('content', '');

      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Content is required');
    });

    it('contentが1001文字超の場合は400を返す', async () => {
      const formData = new FormData();
      formData.append('content', 'a'.repeat(1001));

      const request = new Request(`${BASE_URL}/api/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Content too long (max 1000 characters)');
    });
  });
});

describe('POST /api/external/items', () => {
  beforeEach(() => {
    mockCreateItem.mockResolvedValue(mockItem);
  });

  describe('JSON形式', () => {
    it('contentで201とアイテムを返す', async () => {
      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'テスト項目' }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(201);
      const body = (await response.json()) as { item: typeof mockItem };
      expect(body.item).toEqual(mockItem);
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.anything(),
        { content: 'テスト項目' },
        null,
        null,
      );
    });

    it('contentが空の場合は400を返す', async () => {
      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
    });

    it('contentが1001文字超の場合は400を返す', async () => {
      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'a'.repeat(1001) }),
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(400);
    });
  });

  describe('FormData形式', () => {
    it('contentのみのFormDataで201を返す', async () => {
      const formData = new FormData();
      formData.append('content', 'テスト項目');

      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, makeEnv(), makeCtx());
      expect(response.status).toBe(201);
    });

    it('画像付きFormDataで201を返しR2にアップロードする', async () => {
      const env = makeEnv();
      const formData = new FormData();
      formData.append('content', 'テスト項目');
      formData.append('image', new File([MAGIC.jpeg], 'test.jpg', { type: 'image/jpeg' }));

      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, env, makeCtx());
      expect(response.status).toBe(201);
      expect(env.IMAGES.put).toHaveBeenCalled();
    });
  });
});

describe('画像マジックバイト検証', () => {
  beforeEach(() => {
    mockCreateItem.mockResolvedValue(mockItem);
  });

  it.each([
    ['jpeg', 'image/jpeg', MAGIC.jpeg],
    ['png', 'image/png', MAGIC.png],
    ['webp', 'image/webp', MAGIC.webp],
    ['gif', 'image/gif', MAGIC.gif],
  ])('%s ファイルは201を返す', async (_name, mimeType, bytes) => {
    const formData = new FormData();
    formData.append('content', 'テスト');
    formData.append('image', new File([bytes], `test.${_name}`, { type: mimeType }));

    const request = new Request(`${BASE_URL}/api/items`, {
      method: 'POST',
      body: formData,
    });

    const response = await handler.fetch(request, makeEnv(), makeCtx());
    expect(response.status).toBe(201);
  });

  it('MIMEタイプと内容が不一致の場合は400を返す', async () => {
    const formData = new FormData();
    formData.append('content', 'テスト');
    // JPEG と宣言しているが中身は無効なバイト列
    formData.append('image', new File([MAGIC.fake], 'fake.jpg', { type: 'image/jpeg' }));

    const request = new Request(`${BASE_URL}/api/items`, {
      method: 'POST',
      body: formData,
    });

    const response = await handler.fetch(request, makeEnv(), makeCtx());
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('Image content does not match declared type');
  });

  it('PNG と宣言しているが中身がJPEGの場合は400を返す', async () => {
    const formData = new FormData();
    formData.append('content', 'テスト');
    formData.append('image', new File([MAGIC.jpeg], 'mismatch.png', { type: 'image/png' }));

    const request = new Request(`${BASE_URL}/api/items`, {
      method: 'POST',
      body: formData,
    });

    const response = await handler.fetch(request, makeEnv(), makeCtx());
    expect(response.status).toBe(400);
  });
});
