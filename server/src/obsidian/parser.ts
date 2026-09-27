import { ATTACHMENT_KIND_ORDER, kindOfFilename, type Attachments } from '../attachments';

export interface ObsidianItem {
  id: string;
  content: string;
  attachments: Attachments;
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

const EMBED_LINE = /^!\[\[([^\]]+)\]\]$/;

// 本文末尾に連続する埋め込み行（空行を挟んでもよい）から、種別ごとに最後の1つを添付として取り出す。
// 種別に該当しない埋め込みや、同じ種別の2つ目以降は本文に残す
function extractAttachments(body: string): { content: string; attachments: Attachments } {
  const lines = body.split(/\r?\n/);
  let tailStart = lines.length;
  while (tailStart > 0) {
    const line = lines[tailStart - 1].trim();
    if (line !== '' && !EMBED_LINE.test(line)) break;
    tailStart--;
  }

  const tail = lines.slice(tailStart);
  const attachments: Attachments = {};
  const claimed = new Set<number>();
  for (let i = tail.length - 1; i >= 0; i--) {
    const match = tail[i].trim().match(EMBED_LINE);
    if (!match) continue;
    const kind = kindOfFilename(match[1]);
    if (kind && !attachments[kind]) {
      attachments[kind] = match[1];
      claimed.add(i);
    }
  }

  const rest = tail.filter((_, i) => !claimed.has(i));
  const content = [...lines.slice(0, tailStart), ...rest].join('\n').trim();
  return { content, attachments };
}

export function parseMarkdownToItem(id: string, markdown: string): ObsidianItem {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid markdown format for item: ${id}`);
  }

  const fm = parseFrontmatter(match[1]);
  const { content, attachments } = extractAttachments(match[2].trim());

  return {
    id,
    content,
    attachments,
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
    '---',
    '',
    item.content,
  ];
  const embeds = ATTACHMENT_KIND_ORDER.flatMap((kind) => {
    const filename = item.attachments[kind];
    return filename ? [`![[${filename}]]`] : [];
  });
  if (embeds.length > 0) {
    lines.push('', ...embeds);
  }
  return lines.join('\n');
}
