import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('../obsidian/client');

import { Hono } from 'hono';
import { itemsApp } from '../routes/items';
import * as client from '../obsidian/client';

const testApp = new Hono();
testApp.route('/api/items', itemsApp);

const mockItem = {
  id: 'test-uuid',
  content: 'テストコンテンツ',
  image_filename: null,
  created_at: '2026-01-01T00:00:00.000Z',
  next_review: '2026-05-16',
  interval_days: 1,
  ease_factor: 2.5,
  review_count: 0,
  mastered: false,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/items', () => {
  it('アイテム一覧を返す', async () => {
    (client.listItems as Mock).mockResolvedValue([mockItem]);

    const res = await testApp.request('/api/items');

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('test-uuid');
  });

  it('Obsidianエラー時に500を返す', async () => {
    (client.listItems as Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await testApp.request('/api/items');

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.code).toBe('internal_error');
  });
});

describe('POST /api/items', () => {
  it('JSONで新しいアイテムを作成する', async () => {
    (client.createItem as Mock).mockResolvedValue(mockItem);

    const res = await testApp.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'テストコンテンツ' }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.item.id).toBe('test-uuid');
    expect(res.headers.get('Location')).toBe('/api/items/test-uuid');
  });

  it('URLエンコードフォームで新しいアイテムを作成する', async () => {
    (client.createItem as Mock).mockResolvedValue(mockItem);

    const params = new URLSearchParams({ content: 'テストコンテンツ' });
    const res = await testApp.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    expect(res.status).toBe(201);
  });

  it('空のcontentで400を返す', async () => {
    const res = await testApp.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('validation_error');
  });

  it('1001文字のcontentで400を返す', async () => {
    const res = await testApp.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'a'.repeat(1001) }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('validation_error');
  });
});

describe('PUT /api/items/:id', () => {
  it('アイテムを更新する', async () => {
    const updated = { ...mockItem, content: '更新後のコンテンツ' };
    (client.updateItem as Mock).mockResolvedValue(updated);

    const res = await testApp.request('/api/items/test-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '更新後のコンテンツ' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.content).toBe('更新後のコンテンツ');
  });

  it('存在しないIDで404を返す', async () => {
    (client.updateItem as Mock).mockRejectedValue(new Error('Item not found: unknown-id'));

    const res = await testApp.request('/api/items/unknown-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'テスト' }),
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe('not_found');
  });
});

describe('DELETE /api/items/:id', () => {
  it('アイテムを削除して204を返す', async () => {
    (client.deleteItem as Mock).mockResolvedValue(undefined);

    const res = await testApp.request('/api/items/test-uuid', {
      method: 'DELETE',
    });

    expect(res.status).toBe(204);
  });

  it('存在しないIDで404を返す', async () => {
    (client.deleteItem as Mock).mockRejectedValue(new Error('Item not found: unknown-id'));

    const res = await testApp.request('/api/items/unknown-id', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/items/:id/review', () => {
  it('レビューを記録して更新後アイテムを返す', async () => {
    const reviewed = { ...mockItem, review_count: 1 };
    (client.reviewItem as Mock).mockResolvedValue(reviewed);

    const res = await testApp.request('/api/items/test-uuid/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality: 4 }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.review_count).toBe(1);
    expect(client.reviewItem).toHaveBeenCalledWith('test-uuid', 4);
  });

  it('quality 5以外で400を返す（quality 6）', async () => {
    const res = await testApp.request('/api/items/test-uuid/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality: 6 }),
    });

    expect(res.status).toBe(400);
  });

  it('qualityが数値でない場合400を返す', async () => {
    const res = await testApp.request('/api/items/test-uuid/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality: 'invalid' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/items/:id/master', () => {
  it('アイテムをマスター済みにする', async () => {
    const mastered = { ...mockItem, mastered: true };
    (client.masterItem as Mock).mockResolvedValue(mastered);

    const res = await testApp.request('/api/items/test-uuid/master', {
      method: 'PUT',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.mastered).toBe(true);
  });
});

describe('PUT /api/items/:id/unmaster', () => {
  it('アイテムのマスターを解除する', async () => {
    const unmastered = { ...mockItem, mastered: false };
    (client.unmasterItem as Mock).mockResolvedValue(unmastered);

    const res = await testApp.request('/api/items/test-uuid/unmaster', {
      method: 'PUT',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.mastered).toBe(false);
  });
});
