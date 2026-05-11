import { describe, it, expect } from 'vitest';
import { calculateNextReview, getInitialSM2Values } from '../sm2';

describe('SM-2アルゴリズム', () => {
  const initialItem = {
    ease_factor: 2.5,
    interval_days: 1,
    review_count: 0,
  };

  describe('初回復習（review_count = 0）', () => {
    it('quality 3以上の場合、間隔を1日に設定', () => {
      const result = calculateNextReview(initialItem, 4);
      expect(result.intervalDays).toBe(1);
    });

    it('quality 3未満の場合、間隔を1日に設定', () => {
      const result = calculateNextReview(initialItem, 2);
      expect(result.intervalDays).toBe(1);
    });

    it('ease factorが正しく更新される（quality 4）', () => {
      const result = calculateNextReview(initialItem, 4);
      expect(result.easeFactor).toBeCloseTo(2.5, 2);
    });

    it('ease factorが正しく更新される（quality 2）', () => {
      const result = calculateNextReview(initialItem, 2);
      expect(result.easeFactor).toBeCloseTo(2.18, 2);
    });
  });

  describe('2回目復習（review_count = 1）', () => {
    const secondReviewItem = {
      ease_factor: 2.5,
      interval_days: 1,
      review_count: 1,
    };

    it('quality 3以上の場合、間隔を6日に設定', () => {
      const result = calculateNextReview(secondReviewItem, 4);
      expect(result.intervalDays).toBe(6);
    });

    it('quality 3未満の場合、間隔を1日にリセット', () => {
      const result = calculateNextReview(secondReviewItem, 2);
      expect(result.intervalDays).toBe(1);
    });
  });

  describe('3回目以降の復習（review_count >= 2）', () => {
    const laterReviewItem = {
      ease_factor: 2.5,
      interval_days: 6,
      review_count: 2,
    };

    it('quality 3以上の場合、間隔をease_factorで乗算', () => {
      const result = calculateNextReview(laterReviewItem, 4);
      expect(result.intervalDays).toBe(Math.round(6 * 2.5));
    });

    it('quality 3未満の場合、間隔を1日にリセット', () => {
      const result = calculateNextReview(laterReviewItem, 2);
      expect(result.intervalDays).toBe(1);
    });
  });

  describe('ease factor の境界値', () => {
    it('ease factorが1.3未満になった場合、1.3に制限される', () => {
      const item = { ease_factor: 1.5, interval_days: 1, review_count: 0 };
      const result = calculateNextReview(item, 0);
      expect(result.easeFactor).toBe(1.3);
    });

    it('quality 5でease factorが増加する', () => {
      const result = calculateNextReview(initialItem, 5);
      expect(result.easeFactor).toBe(2.6);
    });
  });

  describe('getInitialSM2Values', () => {
    it('初期値を正しく返す', () => {
      const values = getInitialSM2Values();
      expect(values.interval_days).toBe(1);
      expect(values.ease_factor).toBe(2.5);
      expect(values.review_count).toBe(0);
      expect(values.mastered).toBe(false);
      expect(values.next_review).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
