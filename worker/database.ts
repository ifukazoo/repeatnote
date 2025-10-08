// データベース操作関数
// repeatnote アプリケーション用のD1データベース操作

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
  mastered: boolean;
}

export interface CreateItemData {
  content: string;
}

export interface ReviewResult {
  quality: number; // 0-5 の復習品質評価
}

// アイテム一覧を取得
export async function getItems(db: D1Database): Promise<Item[]> {
  const result = await db
    .prepare('SELECT * FROM items ORDER BY CASE WHEN next_review IS NULL THEN 0 ELSE 1 END, next_review ASC, created_at DESC')
    .all<Item>();

  return result.results;
}

// 復習対象のアイテムを取得（今日まで）
export async function getItemsDueForReview(db: D1Database): Promise<Item[]> {
  const today = new Date().toISOString().split('T')[0] + ' 23:59:59';

  const result = await db
    .prepare(
      'SELECT * FROM items WHERE next_review IS NULL OR next_review <= ? ORDER BY next_review ASC',
    )
    .bind(today)
    .all<Item>();

  return result.results;
}

// 新しいアイテムを作成
export async function createItem(
  db: D1Database,
  data: CreateItemData,
  imageUrl?: string | null,
  imageFilename?: string | null,
): Promise<Item> {
  const now = new Date().toISOString();

  const result = await db
    .prepare(
      `
    INSERT INTO items (content, image_url, image_filename, created_at, next_review, interval_days, ease_factor, review_count)
    VALUES (?, ?, ?, ?, ?, 1, 2.5, 0)
    RETURNING *
  `,
    )
    .bind(data.content, imageUrl || null, imageFilename || null, now, now)
    .first<Item>();

  if (!result) {
    throw new Error('Failed to create item');
  }

  return result;
}

// アイテムを更新
export async function updateItem(
  db: D1Database,
  id: number,
  content: string,
  newImageUrl?: string | null,
  newImageFilename?: string | null,
  shouldRemoveImage: boolean = false,
): Promise<{ item: Item | null; oldImageFilename?: string }> {
  // 現在のアイテム情報を取得（古い画像ファイル名のため）
  const currentItem = await db
    .prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first<Item>();
  if (!currentItem) {
    return { item: null };
  }

  let updateQuery: string;
  let bindValues: (string | number | null)[];

  if (shouldRemoveImage) {
    // 画像削除
    updateQuery =
      'UPDATE items SET content = ?, image_url = NULL, image_filename = NULL WHERE id = ?';
    bindValues = [content, id];
  } else if (newImageUrl && newImageFilename) {
    // 新しい画像に更新
    updateQuery =
      'UPDATE items SET content = ?, image_url = ?, image_filename = ? WHERE id = ?';
    bindValues = [content, newImageUrl, newImageFilename, id];
  } else {
    // コンテンツのみ更新
    updateQuery = 'UPDATE items SET content = ? WHERE id = ?';
    bindValues = [content, id];
  }

  const result = await db
    .prepare(updateQuery)
    .bind(...bindValues)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return { item: null };
  }

  // 更新されたアイテムを取得して返す
  const updatedItem = await db
    .prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first<Item>();

  return {
    item: updatedItem,
    oldImageFilename: currentItem.image_filename || undefined,
  };
}

// アイテムを削除
export async function deleteItem(
  db: D1Database,
  id: number,
): Promise<{ success: boolean; imageFilename?: string }> {
  // 削除前に画像ファイル名を取得
  const item = await db
    .prepare('SELECT image_filename FROM items WHERE id = ?')
    .bind(id)
    .first<{ image_filename: string | null }>();

  const result = await db
    .prepare('DELETE FROM items WHERE id = ?')
    .bind(id)
    .run();

  return {
    success: result.success && result.meta.changes > 0,
    imageFilename: item?.image_filename || undefined,
  };
}

// アイテムの復習を処理（SM-2アルゴリズムで次回復習日を計算）
export async function reviewItem(
  db: D1Database,
  id: number,
  quality: number,
): Promise<Item | null> {
  // まず現在のアイテム情報を取得
  const currentItem = await db
    .prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first<Item>();

  if (!currentItem) {
    return null;
  }

  // SM-2アルゴリズムで次回復習日を計算
  const reviewResult = calculateNextReview(currentItem, quality);

  // データベースを更新
  const result = await db
    .prepare(
      `
    UPDATE items
    SET next_review = ?, interval_days = ?, ease_factor = ?, review_count = review_count + 1
    WHERE id = ?
    RETURNING *
  `,
    )
    .bind(
      reviewResult.nextReview,
      reviewResult.intervalDays,
      reviewResult.easeFactor,
      id,
    )
    .first<Item>();

  return result;
}

// SM-2アルゴリズムによる次回復習日計算
function calculateNextReview(
  item: Item,
  quality: number,
): {
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
} {
  let easeFactor = item.ease_factor;
  let intervalDays = item.interval_days;

  // SM-2アルゴリズム
  if (quality >= 3) {
    // 正解の場合
    if (item.review_count === 0) {
      intervalDays = 1;
    } else if (item.review_count === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }

    // ease factor を調整
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // 不正解の場合は最初からやり直し
    intervalDays = 1;
  }

  // ease factor の下限を設定
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // 次回復習日を計算
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  const nextReview = nextReviewDate.toISOString();

  return {
    nextReview,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100, // 小数点2桁で丸める
  };
}

// アイテムを「覚えた」状態にマーク
export async function masterItem(
  db: D1Database,
  id: number,
): Promise<Item | null> {
  const result = await db
    .prepare('UPDATE items SET mastered = TRUE WHERE id = ? RETURNING *')
    .bind(id)
    .first<Item>();

  return result;
}

// アイテムの「覚えた」状態を解除し、復習スケジュールをリセット
export async function unmasterItem(
  db: D1Database,
  id: number,
): Promise<Item | null> {
  const now = new Date().toISOString();

  const result = await db
    .prepare(`
      UPDATE items
      SET mastered = FALSE,
          review_count = 0,
          interval_days = 1,
          ease_factor = 2.5,
          next_review = ?
      WHERE id = ?
      RETURNING *
    `)
    .bind(now, id)
    .first<Item>();

  return result;
}
