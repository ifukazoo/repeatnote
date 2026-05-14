export interface ObsidianItem {
  id: string;
  content: string;
  image_filename: string | null;
  created_at: string;
  next_review: string | null;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  mastered: boolean;
}

function parseFrontmatter(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

export function parseMarkdownToItem(id: string, markdown: string): ObsidianItem {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid markdown format for item: ${id}`);
  }

  const fm = parseFrontmatter(match[1]);
  const content = match[2].trim();

  return {
    id,
    content,
    image_filename: fm['image_filename'] || null,
    created_at: fm['created_at'],
    next_review: fm['next_review'] || null,
    interval_days: Number(fm['interval_days']),
    ease_factor: Number(fm['ease_factor']),
    review_count: Number(fm['review_count']),
    mastered: fm['mastered'] === 'true',
  };
}

function buildAlias(content: string): string {
  const raw = content.replace(/\n/g, ' ').trim().slice(0, 15);
  return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function itemToMarkdown(item: ObsidianItem): string {
  const easeFactor = Math.round(item.ease_factor * 100) / 100;
  const alias = buildAlias(item.content);
  const lines = [
    '---',
    'aliases:',
    `  - "${alias}"`,
    `created_at: ${item.created_at}`,
    `interval_days: ${item.interval_days}`,
    `ease_factor: ${easeFactor}`,
    `review_count: ${item.review_count}`,
    `next_review: ${item.next_review ?? ''}`,
    `mastered: ${item.mastered}`,
    `image_filename: ${item.image_filename ?? ''}`,
    '---',
    '',
    item.content,
  ];
  return lines.join('\n');
}
