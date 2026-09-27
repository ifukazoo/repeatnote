import type { AttachmentKind } from './types';

// 添付ファイルの種別ごとの設定。検証はファイルの MIME タイプではなく拡張子で行う
// （OS によっては file.type が空になるため）
export interface AttachmentKindConfig {
  extensions: readonly string[];
  accept: string;
  maxSize: number;
  // クリップボードからの貼り付けを受け付ける MIME タイプの接頭辞
  pasteMimePrefix?: string;
  errorMessages: {
    invalidType: string;
    fileTooLarge: string;
  };
}

export const ATTACHMENT_KINDS: Record<AttachmentKind, AttachmentKindConfig> = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    maxSize: 5 * 1024 * 1024, // 5MB
    pasteMimePrefix: 'image/',
    errorMessages: {
      invalidType: 'JPEG、PNG、WebP、GIF形式の画像のみアップロード可能です',
      fileTooLarge: '画像サイズは5MB以下にしてください',
    },
  },
};

export function validateAttachmentFile(kind: AttachmentKind, file: File): string | null {
  const config = ATTACHMENT_KINDS[kind];
  const dot = file.name.lastIndexOf('.');
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  if (!config.extensions.includes(ext)) return config.errorMessages.invalidType;
  if (file.size > config.maxSize) return config.errorMessages.fileTooLarge;
  return null;
}
