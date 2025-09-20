-- repeatnote データベーススキーマ
-- 間隔反復学習用のアイテム管理テーブル

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_review DATETIME,
    interval_days INTEGER DEFAULT 1,
    ease_factor REAL DEFAULT 2.5,
    review_count INTEGER DEFAULT 0
);

-- インデックス作成（復習日での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_items_next_review ON items(next_review);