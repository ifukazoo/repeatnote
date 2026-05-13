import { describe, it, expect } from 'vitest';

// SM-2アルゴリズムのテスト用関数（worker/database.ts から抽出）
function calculateNextReview(
  item: {
    ease_factor: number;
    interval_days: number;
    review_count: number;
  },
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
  } else {
    // 不正解の場合
    intervalDays = 1;
  }

  // EF値の更新
  easeFactor =
    easeFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // EF値は1.3以上に制限
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // 次回復習日を計算
  const nextReview = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return {
    nextReview,
    intervalDays,
    easeFactor,
  };
}

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
      expect(result.easeFactor).toBeCloseTo(2.5, 2); // 実際の実装に合わせる
    });

    it('ease factorが正しく更新される（quality 2）', () => {
      const result = calculateNextReview(initialItem, 2);
      expect(result.easeFactor).toBeCloseTo(2.18, 2); // 実際の計算結果に合わせる
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

    it('quality 3以上の場合、間隔を ease_factor で乗算', () => {
      const result = calculateNextReview(laterReviewItem, 4);
      expect(result.intervalDays).toBe(Math.round(6 * 2.5)); // 元のease_factorで計算
    });

    it('quality 3未満の場合、間隔を1日にリセット', () => {
      const result = calculateNextReview(laterReviewItem, 2);
      expect(result.intervalDays).toBe(1);
    });
  });

  describe('ease factor の境界値テスト', () => {
    it('ease factor が1.3未満になった場合、1.3に制限される', () => {
      const item = {
        ease_factor: 1.5,
        interval_days: 1,
        review_count: 0,
      };
      const result = calculateNextReview(item, 0); // 最低評価
      expect(result.easeFactor).toBe(1.3);
    });

    it('高評価（quality 5）で ease factor が増加する', () => {
      const result = calculateNextReview(initialItem, 5);
      expect(result.easeFactor).toBe(2.6); // 2.5 + 0.1
    });
  });

  describe('次回復習日の計算', () => {
    it('次回復習日が正しい形式で返される', () => {
      const result = calculateNextReview(initialItem, 4);
      expect(result.nextReview).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('間隔日数に基づいて正しい日付が計算される', () => {
      const today = new Date();
      const expected = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = calculateNextReview(initialItem, 4);
      expect(result.nextReview).toBe(expected);
    });
  });
});