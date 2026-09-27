// repeatnote フロントエンド用の型定義

export type AttachmentKind = 'image';

// 種別ごとに1ファイルまで
export type Attachments = Partial<Record<AttachmentKind, string>>;

export interface AttachmentChange {
  file?: File;
  remove?: boolean;
}

export type AttachmentChanges = Partial<Record<AttachmentKind, AttachmentChange>>;

export interface Item {
  id: string;
  content: string;
  attachments: Attachments;
  created_at: string;
  next_review: string | null;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  mastered: boolean;
}

export interface CreateItemData {
  content: string;
  files?: Partial<Record<AttachmentKind, File>>;
}

export interface UpdateItemData {
  content: string;
  changes?: AttachmentChanges;
}

export interface ReviewResult {
  quality: number; // 0-5 の復習品質評価
}

// API レスポンス型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ItemsResponse {
  items: Item[];
}

export interface ItemResponse {
  item: Item;
}

export interface MessageResponse {
  message: string;
}
