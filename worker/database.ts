// データベース操作関数
// repeatnote アプリケーション用のD1データベース操作

export interface Item {
    id: number;
    content: string;
    created_at: string;
    next_review: string | null;
    interval_days: number;
    ease_factor: number;
    review_count: number;
}

export interface CreateItemData {
    content: string;
}

export interface ReviewResult {
    quality: number; // 0-5 の復習品質評価
}

// アイテム一覧を取得
export async function getItems(db: D1Database): Promise<Item[]> {
    const result = await db.prepare('SELECT * FROM items ORDER BY next_review ASC, created_at DESC').all<Item>();

    return result.results;
}

// 復習対象のアイテムを取得（今日まで）
export async function getItemsDueForReview(db: D1Database): Promise<Item[]> {
    const today = new Date().toISOString().split('T')[0] + ' 23:59:59';

    const result = await db
        .prepare('SELECT * FROM items WHERE next_review IS NULL OR next_review <= ? ORDER BY next_review ASC')
        .bind(today)
        .all<Item>();

    return result.results;
}

// 新しいアイテムを作成
export async function createItem(db: D1Database, data: CreateItemData): Promise<Item> {
    const now = new Date().toISOString();

    const result = await db
        .prepare(
            `
    INSERT INTO items (content, created_at, next_review, interval_days, ease_factor, review_count)
    VALUES (?, ?, ?, 1, 2.5, 0)
    RETURNING *
  `
        )
        .bind(data.content, now, now)
        .first<Item>();

    if (!result) {
        throw new Error('Failed to create item');
    }

    return result;
}

// アイテムを更新
export async function updateItem(db: D1Database, id: number, content: string): Promise<Item | null> {
    const result = await db.prepare('UPDATE items SET content = ? WHERE id = ?').bind(content, id).run();

    if (!result.success || result.meta.changes === 0) {
        return null;
    }

    // 更新されたアイテムを取得して返す
    return await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first<Item>();
}

// アイテムを削除
export async function deleteItem(db: D1Database, id: number): Promise<boolean> {
    const result = await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
    return result.success && result.meta.changes > 0;
}

// アイテムの復習を処理（SM-2アルゴリズムで次回復習日を計算）
export async function reviewItem(db: D1Database, id: number, quality: number): Promise<Item | null> {
    // まず現在のアイテム情報を取得
    const currentItem = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first<Item>();

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
  `
        )
        .bind(reviewResult.nextReview, reviewResult.intervalDays, reviewResult.easeFactor, id)
        .first<Item>();

    return result;
}

// SM-2アルゴリズムによる次回復習日計算
function calculateNextReview(
    item: Item,
    quality: number
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
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
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
