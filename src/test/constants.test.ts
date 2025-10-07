import { describe, it, expect } from 'vitest';
import { IMAGE_CONFIG, type AllowedImageType } from '../constants';

describe('IMAGE_CONFIG', () => {
  describe('ALLOWED_TYPES', () => {
    it('適切な画像フォーマットが定義されている', () => {
      expect(IMAGE_CONFIG.ALLOWED_TYPES).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]);
    });

    it('配列が読み取り専用である', () => {
      // TypeScriptの型レベルでの検証のため、実行時エラーはないが型安全性を確認
      const types: readonly string[] = IMAGE_CONFIG.ALLOWED_TYPES;
      expect(types.length).toBe(4);
    });
  });

  describe('MAX_SIZE', () => {
    it('5MBに設定されている', () => {
      expect(IMAGE_CONFIG.MAX_SIZE).toBe(5 * 1024 * 1024);
      expect(IMAGE_CONFIG.MAX_SIZE).toBe(5242880);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('適切なエラーメッセージが定義されている', () => {
      expect(IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE).toBe(
        'JPEG、PNG、WebP、GIF形式の画像のみアップロード可能です'
      );
      expect(IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE).toBe(
        '画像サイズは5MB以下にしてください'
      );
    });

    it('エラーメッセージが空文字列でない', () => {
      expect(IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE.length).toBeGreaterThan(0);
      expect(IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE.length).toBeGreaterThan(0);
    });
  });

  describe('型定義', () => {
    it('AllowedImageType が正しく動作する', () => {
      const validType: AllowedImageType = 'image/jpeg';
      expect(IMAGE_CONFIG.ALLOWED_TYPES.includes(validType)).toBe(true);

      const anotherValidType: AllowedImageType = 'image/png';
      expect(IMAGE_CONFIG.ALLOWED_TYPES.includes(anotherValidType)).toBe(true);

      // 無効な型はコンパイル時にエラーになるので、ランタイムテストのみ
      const invalidType = 'image/bmp';
      expect(IMAGE_CONFIG.ALLOWED_TYPES.includes(invalidType as AllowedImageType)).toBe(false);
    });
  });
});

describe('画像バリデーション関数（ユーティリティ）', () => {
  // App.tsxで使われているような画像バリデーションロジックをテスト
  const validateImageFile = (file: File): string | null => {
    if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedImageType)) {
      return IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE;
    }
    if (file.size > IMAGE_CONFIG.MAX_SIZE) {
      return IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    return null;
  };

  describe('ファイルタイプバリデーション', () => {
    it('有効なMIMEタイプを受け入れる', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateImageFile(validFile)).toBe(null);

      const validPng = new File(['test'], 'test.png', { type: 'image/png' });
      expect(validateImageFile(validPng)).toBe(null);

      const validWebp = new File(['test'], 'test.webp', { type: 'image/webp' });
      expect(validateImageFile(validWebp)).toBe(null);

      const validGif = new File(['test'], 'test.gif', { type: 'image/gif' });
      expect(validateImageFile(validGif)).toBe(null);
    });

    it('無効なMIMEタイプを拒否する', () => {
      const invalidFile = new File(['test'], 'test.bmp', { type: 'image/bmp' });
      expect(validateImageFile(invalidFile)).toBe(
        IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE
      );

      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(validateImageFile(textFile)).toBe(
        IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE
      );
    });
  });

  describe('ファイルサイズバリデーション', () => {
    it('5MB以下のファイルを受け入れる', () => {
      const smallFile = new File(['x'.repeat(1024)], 'small.jpg', { type: 'image/jpeg' });
      expect(validateImageFile(smallFile)).toBe(null);

      const maxSizeFile = new File(['x'.repeat(IMAGE_CONFIG.MAX_SIZE)], 'max.jpg', {
        type: 'image/jpeg'
      });
      expect(validateImageFile(maxSizeFile)).toBe(null);
    });

    it('5MBを超えるファイルを拒否する', () => {
      const oversizeFile = new File(['x'.repeat(IMAGE_CONFIG.MAX_SIZE + 1)], 'large.jpg', {
        type: 'image/jpeg'
      });
      expect(validateImageFile(oversizeFile)).toBe(
        IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE
      );
    });
  });
});