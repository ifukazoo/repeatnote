import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getItems,
  createItem,
  updateItem,
  reviewItem,
  deleteItem,
  masterItem,
  unmasterItem,
  ApiError,
} from '../api';

// fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API関数', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('ApiError', () => {
    it('正しくエラー情報を保持する', () => {
      const error = new ApiError(404, 'Not Found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('getItems', () => {
    it('アイテム一覧を正しく取得する', async () => {
      const mockItems = [
        { id: 1, content: 'テスト項目1', mastered: false },
        { id: 2, content: 'テスト項目2', mastered: true },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems }),
      });

      const result = await getItems();
      expect(result).toEqual(mockItems);
      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('APIエラー時に適切なエラーを投げる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      try {
        await getItems();
        expect(true).toBe(false); // ここに到達すべきではない
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Internal Server Error');
        expect((error as ApiError).status).toBe(500);
      }
    });
  });

  describe('createItem', () => {
    it('テキストのみのアイテムを作成する', async () => {
      const mockItem = { id: 1, content: 'テスト項目', mastered: false };
      const createData = { content: 'テスト項目' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await createItem(createData);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items');
      expect(call[1]?.method).toBe('POST');
      expect(call[1]?.body).toBe(JSON.stringify({ content: 'テスト項目' }));
    });

    it('画像付きのアイテムを作成する', async () => {
      const mockItem = { id: 1, content: 'テスト項目', image_url: '/image.jpg' };
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const createData = { content: 'テスト項目', image: mockFile };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await createItem(createData);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items');
      expect(call[1]?.method).toBe('POST');
      expect(call[1]?.body).toBeInstanceOf(FormData);
    });
  });

  describe('updateItem', () => {
    it('アイテムの内容を更新する', async () => {
      const mockItem = { id: 1, content: '更新後項目', mastered: false };
      const updateData = { content: '更新後項目' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await updateItem(1, updateData);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1');
      expect(call[1]?.method).toBe('PUT');
    });

    it('画像削除フラグ付きで更新する', async () => {
      const mockItem = { id: 1, content: '項目', image_url: null };
      const updateData = { content: '項目', removeImage: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await updateItem(1, updateData);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1');
      expect(call[1]?.method).toBe('PUT');
      expect(call[1]?.body).toBeInstanceOf(FormData);
    });
  });

  describe('reviewItem', () => {
    it('復習処理を正しく実行する', async () => {
      const mockItem = {
        id: 1,
        content: 'テスト項目',
        next_review: '2024-01-02',
        interval_days: 6
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await reviewItem(1, 4);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1/review');
      expect(call[1]?.method).toBe('PUT');
      expect(call[1]?.body).toBe(JSON.stringify({ quality: 4 }));
    });
  });

  describe('deleteItem', () => {
    it('アイテムを正しく削除する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Item deleted' }),
      });

      await deleteItem(1);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1');
      expect(call[1]?.method).toBe('DELETE');
    });
  });

  describe('masterItem', () => {
    it('アイテムを「覚えた」状態にする', async () => {
      const mockItem = { id: 1, content: 'テスト項目', mastered: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await masterItem(1);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1/master');
      expect(call[1]?.method).toBe('PUT');
    });
  });

  describe('unmasterItem', () => {
    it('「覚えた」状態を解除する', async () => {
      const mockItem = { id: 1, content: 'テスト項目', mastered: false };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: mockItem }),
      });

      const result = await unmasterItem(1);
      expect(result).toEqual(mockItem);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('/api/items/1/unmaster');
      expect(call[1]?.method).toBe('PUT');
    });
  });

  describe('エラーハンドリング', () => {
    it('JSON解析エラー時にデフォルトエラーメッセージを使用', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(getItems()).rejects.toThrow('Unknown error');
    });

    it('HTTPステータスコードをエラーメッセージに含める', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await expect(getItems()).rejects.toThrow('HTTP 404');
    });
  });
});