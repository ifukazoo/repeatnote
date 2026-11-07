import type { Item } from '../../types';

function isUnreviewed(item: Item): boolean {
  return item.review_count === 0;
}

function compareByNextReview(a: Item, b: Item): number {
  if (a.next_review === null && b.next_review === null) return 0;
  if (a.next_review === null) return -1;
  if (b.next_review === null) return 1;
  return new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
}

function compareByCreatedAt(a: Item, b: Item): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

// 復習の順番: 一度も復習していないカード（登録の古い順）→ 次回復習日の早い順（日付なしは先頭）
export function sortForReview(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const aNew = isUnreviewed(a);
    const bNew = isUnreviewed(b);
    if (aNew !== bNew) return aNew ? -1 : 1;
    return aNew ? compareByCreatedAt(a, b) : compareByNextReview(a, b);
  });
}
