import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('../obsidian/client');

type ItemResponse = { item: Record<string, unknown> };
type ItemsResponse = { items: Record<string, unknown>[] };
type ErrorResponse = { error: { code: string } };

import { Hono } from 'hono';
import { itemsApp } from '../routes/items';
import * as client from '../obsidian/client';

const testApp = new Hono();
testApp.route('/api/items', itemsApp);

const mockItem = {
  id: 'test-uuid',
  content: 'テストコンテンツ',
  attachments: {},
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
    const data = await res.json() as ItemsResponse;
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('test-uuid');
  });

  it('Obsidianエラー時に500を返す', async () => {
    (client.listItems as Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await testApp.request('/api/items');

    expect(res.status).toBe(500);
    const data = await res.json() as ErrorResponse;
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
    const data = await res.json() as ItemResponse;
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
    const data = await res.json() as ErrorResponse;
    expect(data.error.code).toBe('validation_error');
  });

  it('1001文字のcontentで400を返す', async () => {
    const res = await testApp.request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'a'.repeat(1001) }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as ErrorResponse;
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
    const data = await res.json() as ItemResponse;
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
    const data = await res.json() as ErrorResponse;
    expect(data.error.code).toBe('not_found');
  });
});

describe('添付の受け渡し', () => {
  it('POST の multipart の image を createItem に渡す', async () => {
    (client.createItem as Mock).mockResolvedValue(mockItem);
    const form = new FormData();
    form.append('content', '本文');
    form.append('image', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    const res = await testApp.request('/api/items', { method: 'POST', body: form });

    expect(res.status).toBe(201);
    const [, files] = (client.createItem as Mock).mock.calls[0];
    expect(files.image).toBeInstanceOf(File);
    expect(files.image.name).toBe('photo.jpg');
  });

  it('PUT の multipart の removeImage を削除の指示として渡す', async () => {
    (client.updateItem as Mock).mockResolvedValue(mockItem);
    const form = new FormData();
    form.append('content', '本文');
    form.append('removeImage', 'true');

    await testApp.request('/api/items/test-uuid', { method: 'PUT', body: form });

    expect(client.updateItem).toHaveBeenCalledWith('test-uuid', '本文', {
      image: { file: undefined, remove: true },
    });
  });

  it('PUT の JSON の removeImage を削除の指示として渡す', async () => {
    (client.updateItem as Mock).mockResolvedValue(mockItem);

    await testApp.request('/api/items/test-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '本文', removeImage: true }),
    });

    expect(client.updateItem).toHaveBeenCalledWith('test-uuid', '本文', {
      image: { remove: true },
    });
  });

  it('PUT の JSON で添付の指定がなければ変更なしとして渡す', async () => {
    (client.updateItem as Mock).mockResolvedValue(mockItem);

    await testApp.request('/api/items/test-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '本文' }),
    });

    expect(client.updateItem).toHaveBeenCalledWith('test-uuid', '本文', {});
  });
});

describe('添付の検証', () => {
  function formWith(field: string, file: File): FormData {
    const form = new FormData();
    form.append('content', '本文');
    form.append(field, file);
    return form;
  }

  it.each([
    ['svg', 'evil.svg'],
    ['html', 'page.html'],
    ['拡張子なし', 'noext'],
    ['パストラバーサルを含む名前', 'x./../../foo'],
  ])('image フィールドに画像以外（%s）を送ると 400', async (_, name) => {
    const res = await testApp.request('/api/items', {
      method: 'POST',
      body: formWith('image', new File(['x'], name)),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error.code).toBe('validation_error');
    expect(client.createItem).not.toHaveBeenCalled();
  });

  it('5MB を超える画像は 400', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg');

    const res = await testApp.request('/api/items/test-uuid', {
      method: 'PUT',
      body: formWith('image', big),
    });

    expect(res.status).toBe(400);
    expect(client.updateItem).not.toHaveBeenCalled();
  });

  it.each(['page.html', 'page.htm', 'PAGE.HTML'])('html フィールドに %s を送ると受け付ける', async (name) => {
    (client.createItem as Mock).mockResolvedValue(mockItem);

    const res = await testApp.request('/api/items', {
      method: 'POST',
      body: formWith('html', new File(['<p>x</p>'], name)),
    });

    expect(res.status).toBe(201);
    const [, files] = (client.createItem as Mock).mock.calls[0];
    expect(files.html.name).toBe(name);
  });

  it('html フィールドに画像を送ると 400', async () => {
    const res = await testApp.request('/api/items', {
      method: 'POST',
      body: formWith('html', new File(['x'], 'photo.jpg')),
    });

    expect(res.status).toBe(400);
  });

  it('5MB を超える html は 400', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.html');

    const res = await testApp.request('/api/items', {
      method: 'POST',
      body: formWith('html', big),
    });

    expect(res.status).toBe(400);
  });

  it('PUT の removeHtml を html の削除の指示として渡す', async () => {
    (client.updateItem as Mock).mockResolvedValue(mockItem);

    await testApp.request('/api/items/test-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '本文', removeHtml: true }),
    });

    expect(client.updateItem).toHaveBeenCalledWith('test-uuid', '本文', {
      html: { remove: true },
    });
  });

  it('大文字の拡張子の画像は受け付ける', async () => {
    (client.createItem as Mock).mockResolvedValue(mockItem);

    const res = await testApp.request('/api/items', {
      method: 'POST',
      body: formWith('image', new File(['x'], 'PHOTO.JPG')),
    });

    expect(res.status).toBe(201);
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
    const data = await res.json() as ItemResponse;
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
    const data = await res.json() as ItemResponse;
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
    const data = await res.json() as ItemResponse;
    expect(data.item.mastered).toBe(false);
  });
});
