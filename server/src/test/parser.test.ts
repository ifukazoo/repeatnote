import { describe, it, expect } from 'vitest';
import { parseMarkdownToItem, itemToMarkdown } from '../obsidian/parser';
import type { ObsidianItem } from '../obsidian/parser';

// 新形式: 画像リンクはfrontmatterではなく本文末尾に記述
const SAMPLE_MARKDOWN = `---
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
---

テストアイテムの内容

![[photo.jpg]]`;

const SAMPLE_MARKDOWN_NO_IMAGE = `---
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
---

テストアイテムの内容`;

const SAMPLE_ITEM: ObsidianItem = {
  id: 'abc-123',
  content: 'テストアイテムの内容',
  attachments: { image: 'photo.jpg' },
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

    it('本文に画像リンクがない場合attachmentsは空', () => {
      const item = parseMarkdownToItem('abc-123', SAMPLE_MARKDOWN_NO_IMAGE);
      expect(item.attachments).toEqual({});
      expect(item.content).toBe('テストアイテムの内容');
    });

    it('本文が画像リンクのみの場合contentは空文字', () => {
      const md = `---
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
---

![[photo.jpg]]`;
      const item = parseMarkdownToItem('abc-123', md);
      expect(item.attachments).toEqual({ image: 'photo.jpg' });
      expect(item.content).toBe('');
    });

    it('mastered: trueを正しくパースできる', () => {
      const md = SAMPLE_MARKDOWN_NO_IMAGE.replace('mastered: false', 'mastered: true');
      const item = parseMarkdownToItem('abc-123', md);
      expect(item.mastered).toBe(true);
    });

    it('next_reviewが空の場合nullを返す', () => {
      const md = SAMPLE_MARKDOWN_NO_IMAGE.replace('next_review: 2026-05-16', 'next_review: ');
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
      expect(markdown).toContain('aliases:');
      expect(markdown).toContain('created_at: 2026-01-01T00:00:00.000Z');
      expect(markdown).toContain('interval_days: 7');
      expect(markdown).toContain('ease_factor: 2.5');
      expect(markdown).toContain('review_count: 3');
      expect(markdown).toContain('next_review: 2026-05-16');
      expect(markdown).toContain('mastered: false');
      expect(markdown).toContain('![[photo.jpg]]');
      expect(markdown).toContain('テストアイテムの内容');
      expect(markdown).not.toContain('image_filename');
    });

    it('aliasesにコンテンツ先頭15文字が設定される', () => {
      const item = { ...SAMPLE_ITEM, content: '東京オリンピックが開催された年は2021年' };
      const markdown = itemToMarkdown(item);
      expect(markdown).toContain('  - "東京オリンピックが開催された年"');
    });

    it('コンテンツが15文字未満の場合、aliasesに全文が設定される', () => {
      const markdown = itemToMarkdown(SAMPLE_ITEM);
      expect(markdown).toContain('  - "テストアイテムの内容"');
    });

    it('aliasesのコンテンツ内のダブルクォートをエスケープする', () => {
      const item = { ...SAMPLE_ITEM, content: '答えは"Yes"です' };
      const markdown = itemToMarkdown(item);
      expect(markdown).toContain('  - "答えは\\"Yes\\"です"');
    });

    it('aliasesのコンテンツ内の改行をスペースに変換する', () => {
      const item = { ...SAMPLE_ITEM, content: '一行目\n二行目\n三行目' };
      const markdown = itemToMarkdown(item);
      expect(markdown).toContain('  - "一行目 二行目 三行目"');
    });

    it('添付がない場合、本文に埋め込みリンクを含まない', () => {
      const item = { ...SAMPLE_ITEM, attachments: {} };
      const markdown = itemToMarkdown(item);
      expect(markdown).not.toContain('![[');
      expect(markdown).not.toContain('image_filename');
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

    it('画像なしのItemもラウンドトリップできる', () => {
      const item = { ...SAMPLE_ITEM, attachments: {} };
      const markdown = itemToMarkdown(item);
      const parsed = parseMarkdownToItem(item.id, markdown);
      expect(parsed).toEqual(item);
    });

    it('本文末尾に残した埋め込みがあってもラウンドトリップできる', () => {
      const item = { ...SAMPLE_ITEM, content: '本文\n\n![[old.png]]' };
      const markdown = itemToMarkdown(item);
      const parsed = parseMarkdownToItem(item.id, markdown);
      expect(parsed).toEqual(item);
    });
  });

  describe('本文末尾の埋め込みの解釈', () => {
    const FRONTMATTER = `---
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
---
`;

    it('拡張子が添付種別に該当しない埋め込みは本文に残す', () => {
      const item = parseMarkdownToItem('abc-123', `${FRONTMATTER}\n本文\n\n![[memo]]`);
      expect(item.attachments).toEqual({});
      expect(item.content).toBe('本文\n\n![[memo]]');
    });

    it('拡張子の大文字小文字を区別せずに種別を判別する', () => {
      const item = parseMarkdownToItem('abc-123', `${FRONTMATTER}\n本文\n\n![[photo.JPG]]`);
      expect(item.attachments).toEqual({ image: 'photo.JPG' });
    });

    it('同じ種別が複数ある場合は最後の1つを添付とし、残りは本文に残す', () => {
      const item = parseMarkdownToItem(
        'abc-123',
        `${FRONTMATTER}\n本文\n\n![[first.png]]\n![[second.jpg]]`,
      );
      expect(item.attachments).toEqual({ image: 'second.jpg' });
      expect(item.content).toBe('本文\n\n![[first.png]]');
    });

    it('埋め込みの間に空行があっても解釈できる', () => {
      const item = parseMarkdownToItem('abc-123', `${FRONTMATTER}\n本文\n\n![[memo]]\n\n![[photo.jpg]]`);
      expect(item.attachments).toEqual({ image: 'photo.jpg' });
      expect(item.content).toBe('本文\n\n![[memo]]');
    });

    it('CRLF の改行でも解釈できる', () => {
      const item = parseMarkdownToItem('abc-123', `${FRONTMATTER}\r\n本文\r\n\r\n![[photo.jpg]]\r\n`);
      expect(item.attachments).toEqual({ image: 'photo.jpg' });
      expect(item.content).toBe('本文');
    });
  });
});
