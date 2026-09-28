import { vi, describe, it, expect, afterEach } from 'vitest';
import { listItems } from '../obsidian/client';
import { itemToMarkdown, type ObsidianItem } from '../obsidian/parser';

function makeItem(id: string): ObsidianItem {
  return {
    id,
    content: `content ${id}`,
    image_filename: null,
    created_at: '2026-01-01T00:00:00.000Z',
    next_review: '2026-01-02',
    interval_days: 1,
    ease_factor: 2.5,
    review_count: 0,
    mastered: false,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listItems', () => {
  it('Obsidian への同時接続数を 8 以下に制限し、全アイテムを順序通り返す', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `item-${i}`);
    let inFlight = 0;
    let maxInFlight = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const filename = decodeURIComponent(url.split('/').pop() ?? '');
        if (filename === '') {
          return new Response(JSON.stringify({ files: ids.map((id) => `${id}.md`) }));
        }
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight--;
        return new Response(itemToMarkdown(makeItem(filename.replace(/\.md$/, ''))));
      }),
    );

    const items = await listItems();

    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(items.map((item) => item.id)).toEqual(ids);
  });
});
