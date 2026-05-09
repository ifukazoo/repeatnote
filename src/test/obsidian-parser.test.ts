import { describe, it, expect } from 'vitest';
import { parseMarkdownToItem, itemToMarkdown, ObsidianItem } from '../obsidian/parser';

const SAMPLE_MARKDOWN = `---
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
image_filename: photo.jpg
---

テストアイテムの内容`;

const SAMPLE_ITEM: ObsidianItem = {
  id: 'abc-123',
  content: 'テストアイテムの内容',
  image_filename: 'photo.jpg',
  created_at: '2026-01-01T00:00:00.000Z',
  next_review: '2026-05-16',
  interval_days: 7,
  ease_factor: 2.5,
  review_count: 3,
  mastered: false,
};

describe('Obsidianパーサー', () => {
  describe('parseMarkdownToItem', () => {
    it('有効なMarkdownをItemに変換できる', () => {
      const item = parseMarkdownToItem('abc-123', SAMPLE_MARKDOWN);
      expect(item).toEqual(SAMPLE_ITEM);
    });

    it('image_filenameが空の場合nullを返す', () => {
      const md = SAMPLE_MARKDOWN.replace('image_filename: photo.jpg', 'image_filename: ');
      const item = parseMarkdownToItem('abc-123', md);
      expect(item.image_filename).toBeNull();
    });

    it('mastered: trueを正しくパースできる', () => {
      const md = SAMPLE_MARKDOWN.replace('mastered: false', 'mastered: true');
      const item = parseMarkdownToItem('abc-123', md);
      expect(item.mastered).toBe(true);
    });

    it('next_reviewが空の場合nullを返す', () => {
      const md = SAMPLE_MARKDOWN.replace('next_review: 2026-05-16', 'next_review: ');
      const item = parseMarkdownToItem('abc-123', md);
      expect(item.next_review).toBeNull();
    });

    it('数値フィールドを正しくパースできる', () => {
      const item = parseMarkdownToItem('abc-123', SAMPLE_MARKDOWN);
      expect(item.interval_days).toBe(7);
      expect(item.ease_factor).toBe(2.5);
      expect(item.review_count).toBe(3);
    });

    it('frontmatterがない場合エラーを投げる', () => {
      expect(() => parseMarkdownToItem('abc-123', 'frontmatterなし')).toThrow();
    });
  });

  describe('itemToMarkdown', () => {
    it('ItemをMarkdown形式に変換できる', () => {
      const markdown = itemToMarkdown(SAMPLE_ITEM);
      expect(markdown).toContain('created_at: 2026-01-01T00:00:00.000Z');
      expect(markdown).toContain('interval_days: 7');
      expect(markdown).toContain('ease_factor: 2.5');
      expect(markdown).toContain('review_count: 3');
      expect(markdown).toContain('next_review: 2026-05-16');
      expect(markdown).toContain('mastered: false');
      expect(markdown).toContain('image_filename: photo.jpg');
      expect(markdown).toContain('テストアイテムの内容');
    });

    it('image_filenameがnullの場合、空文字として出力する', () => {
      const item = { ...SAMPLE_ITEM, image_filename: null };
      const markdown = itemToMarkdown(item);
      expect(markdown).toContain('image_filename: ');
    });

    it('next_reviewがnullの場合、空文字として出力する', () => {
      const item = { ...SAMPLE_ITEM, next_review: null };
      const markdown = itemToMarkdown(item);
      expect(markdown).toContain('next_review: ');
    });
  });

  describe('ラウンドトリップ', () => {
    it('Item → Markdown → Item で同じItemが得られる', () => {
      const markdown = itemToMarkdown(SAMPLE_ITEM);
      const parsed = parseMarkdownToItem(SAMPLE_ITEM.id, markdown);
      expect(parsed).toEqual(SAMPLE_ITEM);
    });

    it('ease_factorが小数の場合もラウンドトリップできる', () => {
      const item = { ...SAMPLE_ITEM, ease_factor: 2.36 };
      const markdown = itemToMarkdown(item);
      const parsed = parseMarkdownToItem(item.id, markdown);
      expect(parsed.ease_factor).toBe(2.36);
    });
  });
});
