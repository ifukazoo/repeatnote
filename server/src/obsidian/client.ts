import { parseMarkdownToItem, itemToMarkdown, type ObsidianItem } from './parser';
import { calculateNextReview, getInitialSM2Values } from '../sm2';
import {
  ATTACHMENT_KIND_ORDER,
  contentTypeFor,
  isServableFilename,
  storedFilename,
  type AttachmentChanges,
  type AttachmentKind,
} from '../attachments';

function getBaseUrl(): string {
  return process.env.OBSIDIAN_BASE_URL ?? 'http://127.0.0.1:27123';
}

function getVaultFolder(): string {
  return process.env.OBSIDIAN_VAULT_FOLDER ?? 'repeatnote';
}

function getApiKey(): string {
  return process.env.OBSIDIAN_API_KEY ?? '';
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getApiKey()}` };
}

async function vaultGet(path: string): Promise<Response> {
  return fetch(`${getBaseUrl()}/vault/${getVaultFolder()}/${path}`, {
    headers: authHeaders(),
  });
}

async function vaultPut(path: string, body: string | File, contentType: string): Promise<Response> {
  return fetch(`${getBaseUrl()}/vault/${getVaultFolder()}/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': contentType },
    body,
  });
}

async function vaultDelete(path: string): Promise<Response> {
  return fetch(`${getBaseUrl()}/vault/${getVaultFolder()}/${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

// Obsidian は数百本の同時接続を受けると ECONNRESET で接続を切るため、並列数を制限する
const MAX_CONCURRENT_REQUESTS = 8;

async function mapWithConcurrency<T, R>(
  inputs: T[],
  limit: number,
  fn: (input: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(inputs.length);
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const index = next++;
      results[index] = await fn(inputs[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, inputs.length) }, worker));
  return results;
}

export async function listItems(): Promise<ObsidianItem[]> {
  const res = await vaultGet('');
  if (!res.ok) throw new Error(`Obsidian API error: ${res.status}`);

  const data = (await res.json()) as { files: string[] };
  const mdFiles = data.files.filter((f: string) => f.endsWith('.md'));

  const items = await mapWithConcurrency(
    mdFiles,
    MAX_CONCURRENT_REQUESTS,
    async (filename: string) => {
      const id = filename.replace(/\.md$/, '');
      const fileRes = await vaultGet(filename);
      if (!fileRes.ok) return null;
      const content = await fileRes.text();
      try {
        return parseMarkdownToItem(id, content);
      } catch {
        return null;
      }
    },
  );

  return items.filter((item): item is ObsidianItem => item !== null);
}

async function uploadAttachment(kind: AttachmentKind, file: File): Promise<string> {
  const filename = storedFilename(kind, file.name);

  const res = await vaultPut(`attachments/${filename}`, file, contentTypeFor(filename));
  if (!res.ok) throw new Error(`Failed to upload attachment: ${res.status}`);

  return filename;
}

// 後始末なので失敗しても処理を止めない
// attachments/ の外を指す名前は消さない（パーサー側の判定に加えた多重防御）
async function deleteAttachmentFiles(filenames: string[]): Promise<void> {
  await Promise.all(
    filenames
      .filter(isServableFilename)
      .map((filename) => vaultDelete(`attachments/${filename}`).catch(() => undefined)),
  );
}

// 添付の変更を反映して md を書き込む。
// 順序は「新ファイル PUT → md PUT → 旧ファイル削除」。途中で失敗したら新ファイルを削除し、旧ファイルは残す。
// 新しいファイルと削除が両方指示された場合は差し替えを優先する
async function saveItemWithAttachments(
  item: ObsidianItem,
  changes: AttachmentChanges,
): Promise<ObsidianItem> {
  const attachments = { ...item.attachments };
  const uploaded: string[] = [];
  const obsolete: string[] = [];

  try {
    for (const kind of ATTACHMENT_KIND_ORDER) {
      const change = changes[kind];
      const current = attachments[kind];
      if (change?.file) {
        const filename = await uploadAttachment(kind, change.file);
        uploaded.push(filename);
        if (current) obsolete.push(current);
        attachments[kind] = filename;
      } else if (change?.remove) {
        if (current) obsolete.push(current);
        delete attachments[kind];
      }
    }

    const saved: ObsidianItem = { ...item, attachments };
    const res = await vaultPut(`${item.id}.md`, itemToMarkdown(saved), 'text/markdown');
    if (!res.ok) throw new Error(`Failed to save item: ${res.status}`);

    await deleteAttachmentFiles(obsolete);
    return saved;
  } catch (err) {
    await deleteAttachmentFiles(uploaded);
    throw err;
  }
}

export async function createItem(
  content: string,
  files: Partial<Record<AttachmentKind, File>> = {},
): Promise<ObsidianItem> {
  const initial = getInitialSM2Values();
  const item: ObsidianItem = {
    id: crypto.randomUUID(),
    content,
    attachments: {},
    created_at: new Date().toISOString(),
    next_review: initial.next_review,
    interval_days: initial.interval_days,
    ease_factor: initial.ease_factor,
    review_count: initial.review_count,
    mastered: initial.mastered,
  };

  const changes: AttachmentChanges = {};
  for (const kind of ATTACHMENT_KIND_ORDER) {
    const file = files[kind];
    if (file) changes[kind] = { file };
  }
  return saveItemWithAttachments(item, changes);
}

export async function updateItem(
  id: string,
  content: string,
  changes: AttachmentChanges = {},
): Promise<ObsidianItem> {
  const fileRes = await vaultGet(`${id}.md`);
  if (!fileRes.ok) throw new Error(`Item not found: ${id}`);

  const current = parseMarkdownToItem(id, await fileRes.text());
  return saveItemWithAttachments({ ...current, content }, changes);
}

export async function deleteItem(id: string): Promise<void> {
  const fileRes = await vaultGet(`${id}.md`);
  const attachments = fileRes.ok ? parseMarkdownToItem(id, await fileRes.text()).attachments : {};

  const res = await vaultDelete(`${id}.md`);
  if (!res.ok) throw new Error(`Item not found: ${id}`);

  await deleteAttachmentFiles(Object.values(attachments));
}

export async function reviewItem(id: string, quality: number): Promise<ObsidianItem> {
  const fileRes = await vaultGet(`${id}.md`);
  if (!fileRes.ok) throw new Error(`Item not found: ${id}`);

  const current = parseMarkdownToItem(id, await fileRes.text());
  const result = calculateNextReview(current, quality);

  const updated: ObsidianItem = {
    ...current,
    interval_days: result.intervalDays,
    ease_factor: result.easeFactor,
    review_count: current.review_count + 1,
    next_review: result.nextReview,
  };

  const res = await vaultPut(`${id}.md`, itemToMarkdown(updated), 'text/markdown');
  if (!res.ok) throw new Error(`Failed to update item after review: ${res.status}`);

  return updated;
}

export async function masterItem(id: string): Promise<ObsidianItem> {
  const fileRes = await vaultGet(`${id}.md`);
  if (!fileRes.ok) throw new Error(`Item not found: ${id}`);

  const current = parseMarkdownToItem(id, await fileRes.text());
  const updated: ObsidianItem = { ...current, mastered: true };

  const res = await vaultPut(`${id}.md`, itemToMarkdown(updated), 'text/markdown');
  if (!res.ok) throw new Error(`Failed to master item: ${res.status}`);

  return updated;
}

export async function unmasterItem(id: string): Promise<ObsidianItem> {
  const fileRes = await vaultGet(`${id}.md`);
  if (!fileRes.ok) throw new Error(`Item not found: ${id}`);

  const current = parseMarkdownToItem(id, await fileRes.text());
  const initial = getInitialSM2Values();

  const updated: ObsidianItem = {
    ...current,
    mastered: false,
    interval_days: initial.interval_days,
    ease_factor: initial.ease_factor,
    review_count: 0,
    next_review: initial.next_review,
  };

  const res = await vaultPut(`${id}.md`, itemToMarkdown(updated), 'text/markdown');
  if (!res.ok) throw new Error(`Failed to unmaster item: ${res.status}`);

  return updated;
}

export async function getAttachment(filename: string): Promise<ArrayBuffer> {
  const res = await vaultGet(`attachments/${filename}`);
  if (!res.ok) throw new Error(`Attachment not found: ${filename}`);

  return res.arrayBuffer();
}
