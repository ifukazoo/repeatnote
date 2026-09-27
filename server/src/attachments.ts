// 添付ファイルの種別レジストリ。種別の判別・アップロード時の検証・保存名・配信ヘッダーはすべてここを参照する

export type AttachmentKind = 'image' | 'html';

// 種別ごとに1ファイルまで
export type Attachments = Partial<Record<AttachmentKind, string>>;

export interface AttachmentChange {
  file?: File;
  remove?: boolean;
}

export type AttachmentChanges = Partial<Record<AttachmentKind, AttachmentChange>>;

interface AttachmentKindSpec {
  // 拡張子（小文字）→ Content-Type。アップロードと配信の許可リストを兼ねる
  contentTypes: Record<string, string>;
  // 保存時の拡張子を1つに揃える場合に指定（.htm → .html）
  storedExtension?: string;
  maxSize: number;
  // 配信時に追加するヘッダー
  headers: Record<string, string>;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const ATTACHMENT_KINDS: Record<AttachmentKind, AttachmentKindSpec> = {
  image: {
    contentTypes: {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    },
    maxSize: MAX_SIZE,
    headers: {},
  },
  html: {
    contentTypes: {
      html: 'text/html; charset=utf-8',
      htm: 'text/html; charset=utf-8',
    },
    storedExtension: 'html',
    maxSize: MAX_SIZE,
    // URL を直接開いた場合も同一オリジンの権限を持たせない（フロントの iframe sandbox と同じ設定）
    headers: {
      'Content-Security-Policy':
        'sandbox allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox',
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

// アップロードされたファイルを検証する。問題がなければ null
export function validateAttachmentFile(kind: AttachmentKind, file: File): string | null {
  if (kindOfFilename(file.name) !== kind) return `Unsupported file type for ${kind}`;
  if (file.size > ATTACHMENT_KINDS[kind].maxSize) return `File too large for ${kind}`;
  return null;
}

// 保存名はクライアントのファイル名を使わず、{uuid}.{小文字の拡張子} で決める。
// validateAttachmentFile を通ったファイルにのみ使う
export function storedFilename(kind: AttachmentKind, originalName: string): string {
  const ext = ATTACHMENT_KINDS[kind].storedExtension ?? getExtension(originalName);
  return `${crypto.randomUUID()}.${ext}`;
}

// 英数字・ハイフン・アンダースコア・ドットのみ（パス区切りや先頭ドットを含まない）で、
// 拡張子が許可リストにある名前だけを配信する
const SAFE_FILENAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export function isServableFilename(filename: string): boolean {
  return (
    SAFE_FILENAME.test(filename) && !filename.includes('..') && kindOfFilename(filename) !== null
  );
}

export function contentTypeFor(filename: string): string {
  const kind = kindOfFilename(filename);
  const ext = getExtension(filename);
  if (!kind || !ext) throw new Error(`Unsupported attachment: ${filename}`);
  return ATTACHMENT_KINDS[kind].contentTypes[ext];
}

// 配信時のヘッダー。Content-Type は Obsidian の応答ではなく拡張子から決める
export function responseHeaders(filename: string): Record<string, string> {
  const kind = kindOfFilename(filename);
  if (!kind) throw new Error(`Unsupported attachment: ${filename}`);
  return {
    'Content-Type': contentTypeFor(filename),
    'X-Content-Type-Options': 'nosniff',
    ...ATTACHMENT_KINDS[kind].headers,
  };
}
