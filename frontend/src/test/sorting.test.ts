import { describe, it, expect } from 'vitest';
import { sortForReview } from '../components/ItemList/sortItems';
import type { Item } from '../types';

// 復習済み（review_count >= 1）のカードを既定にする
function makeItem(overrides: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    content: '',
    attachments: {},
    created_at: '2024-01-01T00:00:00.000Z',
    next_review: '2024-01-01',
    interval_days: 1,
    ease_factor: 2.5,
    review_count: 1,
    mastered: false,
    ...overrides,
  };
}

const ids = (items: Item[]) => items.map((item) => item.id);

describe('sortForReview', () => {
  describe('復習済みのカード', () => {
    it('next_reviewがnullの項目が最初に表示される', () => {
      const items = [
        makeItem({ id: 'c', next_review: '2024-01-03' }),
        makeItem({ id: 'null', next_review: null }),
        makeItem({ id: 'a', next_review: '2024-01-01' }),
      ];
      expect(ids(sortForReview(items))).toEqual(['null', 'a', 'c']);
    });

    it('次回復習日が昇順でソートされる', () => {
      const items = [
        makeItem({ id: '5', next_review: '2024-01-05' }),
        makeItem({ id: '1', next_review: '2024-01-01' }),
        makeItem({ id: '3', next_review: '2024-01-03' }),
        makeItem({ id: '2', next_review: '2024-01-02' }),
      ];
      expect(ids(sortForReview(items))).toEqual(['1', '2', '3', '5']);
    });

    it('複数のnull値が正しく処理される', () => {
      const items = [
        makeItem({ id: '2', next_review: '2024-01-02' }),
        makeItem({ id: 'null1', next_review: null }),
        makeItem({ id: 'null2', next_review: null }),
        makeItem({ id: '1', next_review: '2024-01-01' }),
      ];
      expect(ids(sortForReview(items))).toEqual(['null1', 'null2', '1', '2']);
    });

    it('同一日時の項目は入力順が保たれる', () => {
      const items = [
        makeItem({ id: 'x', next_review: '2024-01-01' }),
        makeItem({ id: 'y', next_review: '2024-01-01' }),
        makeItem({ id: 'z', next_review: '2024-01-01' }),
      ];
      expect(ids(sortForReview(items))).toEqual(['x', 'y', 'z']);
    });
  });

  it('元の配列を変更しない', () => {
    const items = [
      makeItem({ id: 'c', next_review: '2024-01-03' }),
      makeItem({ id: 'a', next_review: '2024-01-01' }),
    ];
    const before = ids(items);
    sortForReview(items);
    expect(ids(items)).toEqual(before);
  });

  it('空の配列を正しく処理する', () => {
    expect(sortForReview([])).toEqual([]);
  });
});
