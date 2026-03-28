// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './index';
import { createItem } from './database';

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

      const response = await handler.fetch(request, makeEnv());
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

      const response = await handler.fetch(request, makeEnv());
      expect(response.status).toBe(400);
    });

    it('contentが751文字超の場合は400を返す', async () => {
      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'a'.repeat(751) }),
      });

      const response = await handler.fetch(request, makeEnv());
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

      const response = await handler.fetch(request, makeEnv());
      expect(response.status).toBe(201);
    });

    it('画像付きFormDataで201を返しR2にアップロードする', async () => {
      const env = makeEnv();
      const formData = new FormData();
      formData.append('content', 'テスト項目');
      formData.append(
        'image',
        new File(['dummy'], 'test.jpg', { type: 'image/jpeg' }),
      );

      const request = new Request(`${BASE_URL}/api/external/items`, {
        method: 'POST',
        body: formData,
      });

      const response = await handler.fetch(request, env);
      expect(response.status).toBe(201);
      expect(env.IMAGES.put).toHaveBeenCalled();
    });
  });
});
