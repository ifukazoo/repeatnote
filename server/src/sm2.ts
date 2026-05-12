export interface SM2Input {
  ease_factor: number;
  interval_days: number;
  review_count: number;
}

export interface SM2Result {
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
}

export function calculateNextReview(item: SM2Input, quality: number): SM2Result {
  let easeFactor = item.ease_factor;
  let intervalDays = item.interval_days;

  if (quality >= 3) {
    if (item.review_count === 0) {
      intervalDays = 1;
    } else if (item.review_count === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  } else {
    intervalDays = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const nextReview = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return { nextReview, intervalDays, easeFactor };
}

export function getInitialSM2Values() {
  return {
    interval_days: 1,
    ease_factor: 2.5,
    review_count: 0,
    next_review: new Date().toISOString().split('T')[0],
    mastered: false,
  };
}
