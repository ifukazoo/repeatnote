import { getApiKey, getBaseUrl, getVaultFolder, getVaultPath } from './config';
import { ObsidianItem, parseMarkdownToItem, itemToMarkdown } from './parser';
import { calculateNextReview, getInitialSM2Values } from '../sm2';

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
  };
}

async function vaultGet(path: string): Promise<Response> {
  return fetch(`${getBaseUrl()}/vault/${getVaultFolder()}/${path}`, {
    headers: authHeaders(),
  });
}

async function vaultPut(path: string, body: string | Blob, contentType: string): Promise<Response> {
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

export async function listItems(): Promise<ObsidianItem[]> {
  const res = await vaultGet('');
  if (!res.ok) throw new Error(`Obsidian API error: ${res.status}`);

  const data = await res.json() as { files: string[] };
  const mdFiles = data.files.filter((f: string) => f.endsWith('.md'));

  const items = await Promise.all(
    mdFiles.map(async (filename: string) => {
      const id = filename.replace(/\.md$/, '');
      const fileRes = await vaultGet(filename);
      if (!fileRes.ok) return null;
      const content = await fileRes.text();
      try {
        return parseMarkdownToItem(id, content);
      } catch {
        return null;
      }
    }),
  );

  return items.filter((item): item is ObsidianItem => item !== null);
}

export async function createItem(
  content: string,
  imageFile?: File,
): Promise<ObsidianItem> {
  const id = crypto.randomUUID();
  const initial = getInitialSM2Values();

  let imageFilename: string | null = null;
  if (imageFile) {
    imageFilename = await uploadImage(imageFile);
  }

  const item: ObsidianItem = {
    id,
    content,
    image_filename: imageFilename,
    created_at: new Date().toISOString(),
    next_review: initial.next_review,
    interval_days: initial.interval_days,
    ease_factor: initial.ease_factor,
    review_count: initial.review_count,
    mastered: initial.mastered,
  };

  const res = await vaultPut(`${id}.md`, itemToMarkdown(item), 'text/markdown');
  if (!res.ok) throw new Error(`Failed to create item: ${res.status}`);

  return item;
}

export async function updateItem(
  id: string,
  content: string,
  imageFile?: File,
  removeImage?: boolean,
): Promise<ObsidianItem> {
  const fileRes = await vaultGet(`${id}.md`);
  if (!fileRes.ok) throw new Error(`Item not found: ${id}`);

  const current = parseMarkdownToItem(id, await fileRes.text());

  let imageFilename = current.image_filename;

  if (removeImage) {
    if (current.image_filename) {
      await vaultDelete(`attachments/${current.image_filename}`);
    }
    imageFilename = null;
  } else if (imageFile) {
    if (current.image_filename) {
      await vaultDelete(`attachments/${current.image_filename}`);
    }
    imageFilename = await uploadImage(imageFile);
  }

  const updated: ObsidianItem = { ...current, content, image_filename: imageFilename };
  const res = await vaultPut(`${id}.md`, itemToMarkdown(updated), 'text/markdown');
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);

  return updated;
}

export async function deleteItem(id: string): Promise<void> {
  const fileRes = await vaultGet(`${id}.md`);
  if (fileRes.ok) {
    const item = parseMarkdownToItem(id, await fileRes.text());
    if (item.image_filename) {
      await vaultDelete(`attachments/${item.image_filename}`);
    }
  }

  const res = await vaultDelete(`${id}.md`);
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
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

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;

  const res = await vaultPut(`attachments/${filename}`, file, file.type);
  if (!res.ok) throw new Error(`Failed to upload image: ${res.status}`);

  return filename;
}

export function getImageUrl(filename: string): string {
  return getVaultPath(`attachments/${filename}`);
}
