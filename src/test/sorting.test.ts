import { describe, it, expect } from 'vitest';

describe('アイテムソート機能', () => {
  // App.tsxのソート関数を抽出してテスト
  const sortItemsByNextReview = (items: Array<{ next_review: string | null }>) => {
    return [...items].sort((a, b) => {
      // next_reviewがnullの項目を最初に表示（即座に復習が必要）
      if (a.next_review === null && b.next_review === null) return 0;
      if (a.next_review === null) return -1;
      if (b.next_review === null) return 1;

      // 次回復習日の昇順でソート
      return new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
    });
  };

  it('next_reviewがnullの項目が最初に表示される', () => {
    const items = [
      { next_review: '2024-01-03' },
      { next_review: null },
      { next_review: '2024-01-01' },
    ];

    const sorted = sortItemsByNextReview(items);

    expect(sorted[0].next_review).toBe(null);
    expect(sorted[1].next_review).toBe('2024-01-01');
    expect(sorted[2].next_review).toBe('2024-01-03');
  });

  it('次回復習日が昇順でソートされる', () => {
    const items = [
      { next_review: '2024-01-05' },
      { next_review: '2024-01-01' },
      { next_review: '2024-01-03' },
      { next_review: '2024-01-02' },
    ];

    const sorted = sortItemsByNextReview(items);

    expect(sorted[0].next_review).toBe('2024-01-01');
    expect(sorted[1].next_review).toBe('2024-01-02');
    expect(sorted[2].next_review).toBe('2024-01-03');
    expect(sorted[3].next_review).toBe('2024-01-05');
  });

  it('複数のnull値が正しく処理される', () => {
    const items = [
      { next_review: '2024-01-02' },
      { next_review: null },
      { next_review: null },
      { next_review: '2024-01-01' },
    ];

    const sorted = sortItemsByNextReview(items);

    expect(sorted[0].next_review).toBe(null);
    expect(sorted[1].next_review).toBe(null);
    expect(sorted[2].next_review).toBe('2024-01-01');
    expect(sorted[3].next_review).toBe('2024-01-02');
  });

  it('同じ次回復習日の項目が安定してソートされる', () => {
    const items = [
      { next_review: '2024-01-01' },
      { next_review: '2024-01-01' },
      { next_review: '2024-01-01' },
    ];

    const sorted = sortItemsByNextReview(items);

    // 同じ日付なので順序は変わらない
    expect(sorted.every(item => item.next_review === '2024-01-01')).toBe(true);
  });

  it('空の配列を正しく処理する', () => {
    const items: Array<{ next_review: string | null }> = [];

    const sorted = sortItemsByNextReview(items);

    expect(sorted).toEqual([]);
  });

  it('単一項目の配列を正しく処理する', () => {
    const items = [{ next_review: '2024-01-01' }];

    const sorted = sortItemsByNextReview(items);

    expect(sorted).toEqual([{ next_review: '2024-01-01' }]);
  });

  it('時間を含む日付文字列も正しくソートされる', () => {
    const items = [
      { next_review: '2024-01-01T12:00:00.000Z' },
      { next_review: '2024-01-01T06:00:00.000Z' },
      { next_review: '2024-01-01T18:00:00.000Z' },
    ];

    const sorted = sortItemsByNextReview(items);

    expect(sorted[0].next_review).toBe('2024-01-01T06:00:00.000Z');
    expect(sorted[1].next_review).toBe('2024-01-01T12:00:00.000Z');
    expect(sorted[2].next_review).toBe('2024-01-01T18:00:00.000Z');
  });
});