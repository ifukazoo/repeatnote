// repeatnote フロントエンド用の型定義

export interface Item {
  id: number;
  content: string;
  image_url: string | null;
  image_filename: string | null;
  created_at: string;
  next_review: string | null;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

export interface CreateItemData {
  content: string;
  image?: File;
}

export interface UpdateItemData {
  content: string;
  image?: File;
  removeImage?: boolean;
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
