// 画像設定の定数
export const IMAGE_CONFIG = {
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ERROR_MESSAGES: {
    INVALID_TYPE: 'JPEG、PNG、WebP、GIF形式の画像のみアップロード可能です',
    FILE_TOO_LARGE: '画像サイズは5MB以下にしてください'
  }
} as const