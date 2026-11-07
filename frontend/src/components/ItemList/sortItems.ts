import type { Item } from '../../types';

function compareByNextReview(a: Item, b: Item): number {
  if (a.next_review === null && b.next_review === null) return 0;
  if (a.next_review === null) return -1;
  if (b.next_review === null) return 1;
  return new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
}

// 復習の順番: 次回復習日の早い順（日付なしは先頭）
export function sortForReview(items: Item[]): Item[] {
  return [...items].sort(compareByNextReview);
}
