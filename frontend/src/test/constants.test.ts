import { describe, it, expect } from 'vitest';
import { ATTACHMENT_KINDS, validateAttachmentFile } from '../constants';

describe('ATTACHMENT_KINDS', () => {
  describe('image', () => {
    it('許可する拡張子が正しく設定されている', () => {
      expect(ATTACHMENT_KINDS.image.extensions).toEqual(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    });

    it('最大ファイルサイズが5MBに設定されている', () => {
      expect(ATTACHMENT_KINDS.image.maxSize).toBe(5 * 1024 * 1024);
    });

    it('エラーメッセージが正しく設定されている', () => {
      expect(ATTACHMENT_KINDS.image.errorMessages.invalidType).toBe(
        'JPEG、PNG、WebP、GIF形式の画像のみアップロード可能です',
      );
      expect(ATTACHMENT_KINDS.image.errorMessages.fileTooLarge).toBe(
        '画像サイズは5MB以下にしてください',
      );
    });

    it('クリップボードからの画像の貼り付けを受け付ける', () => {
      expect(ATTACHMENT_KINDS.image.pasteMimePrefix).toBe('image/');
    });
  });
});

describe('validateAttachmentFile', () => {
  const { maxSize, errorMessages } = ATTACHMENT_KINDS.image;

  it('許可された拡張子の画像を受け付ける', () => {
    for (const name of ['a.jpg', 'a.jpeg', 'a.png', 'a.webp', 'a.gif']) {
      expect(validateAttachmentFile('image', new File(['x'], name))).toBeNull();
    }
  });

  it('拡張子の大文字小文字を区別しない', () => {
    expect(validateAttachmentFile('image', new File(['x'], 'PHOTO.JPG'))).toBeNull();
  });

  it('file.type が空でも拡張子で判定する', () => {
    expect(validateAttachmentFile('image', new File(['x'], 'photo.png', { type: '' }))).toBeNull();
  });

  it('許可されていない拡張子を拒否する', () => {
    expect(validateAttachmentFile('image', new File(['x'], 'a.bmp'))).toBe(
      errorMessages.invalidType,
    );
    expect(validateAttachmentFile('image', new File(['x'], 'a.svg'))).toBe(
      errorMessages.invalidType,
    );
    expect(validateAttachmentFile('image', new File(['x'], 'noext'))).toBe(
      errorMessages.invalidType,
    );
  });

  it('上限ちょうどのサイズは受け付け、超えると拒否する', () => {
    expect(validateAttachmentFile('image', new File(['x'.repeat(maxSize)], 'max.jpg'))).toBeNull();
    expect(validateAttachmentFile('image', new File(['x'.repeat(maxSize + 1)], 'big.jpg'))).toBe(
      errorMessages.fileTooLarge,
    );
  });
});
