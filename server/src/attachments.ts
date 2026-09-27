// 添付ファイルの種別レジストリ。種別の判別・アップロード・配信はすべてここを参照する

export type AttachmentKind = 'image';

// 種別ごとに1ファイルまで
export type Attachments = Partial<Record<AttachmentKind, string>>;

export interface AttachmentChange {
  file?: File;
  remove?: boolean;
}

export type AttachmentChanges = Partial<Record<AttachmentKind, AttachmentChange>>;

interface AttachmentKindSpec {
  // 拡張子（小文字）→ Content-Type
  contentTypes: Record<string, string>;
}

export const ATTACHMENT_KINDS: Record<AttachmentKind, AttachmentKindSpec> = {
  image: {
    contentTypes: {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    },
  },
};

// 本文末尾に書き出す順序
export const ATTACHMENT_KIND_ORDER = Object.keys(ATTACHMENT_KINDS) as AttachmentKind[];

export function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export function kindOfFilename(filename: string): AttachmentKind | null {
  const ext = getExtension(filename);
  if (!ext) return null;
  return ATTACHMENT_KIND_ORDER.find((kind) => ext in ATTACHMENT_KINDS[kind].contentTypes) ?? null;
}

// multipart / JSON で削除を指示するフィールド名（image → removeImage）
export function removeFieldName(kind: AttachmentKind): string {
  return `remove${kind[0].toUpperCase()}${kind.slice(1)}`;
}
