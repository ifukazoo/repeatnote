-- マイグレーション: mastered カラムの追加
-- 実行日: 2025-01-04

-- 既存のitemsテーブルにmasteredカラムを追加
ALTER TABLE items ADD COLUMN mastered BOOLEAN DEFAULT FALSE;