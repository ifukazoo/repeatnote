import { Hono } from 'hono';
import type { Context } from 'hono';
import * as client from '../obsidian/client';
import {
  ATTACHMENT_KIND_ORDER,
  removeFieldName,
  validateAttachmentFile,
  type AttachmentChanges,
  type AttachmentKind,
} from '../attachments';

export const itemsApp = new Hono();

function errorResponse(c: Context, err: unknown): Response {
  if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
    return c.json({ error: { code: 'not_found', message: err.message } }, 404);
  }
  console.error(err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
}

function contentError(content: unknown): string | null {
  if (typeof content !== 'string' || content.trim().length === 0) return 'Content is required';
  if (content.length > 1000) return 'Content exceeds 1000 characters';
  return null;
}

// multipart / urlencoded / JSON のリクエストから本文と添付の変更を読み取る。
// 添付のフィールド名は種別名（image）、削除は removeImage のように指定する
async function readItemRequest(
  c: Context,
): Promise<{ rawContent: unknown; changes: AttachmentChanges }> {
  const contentType = c.req.header('content-type') ?? '';
  const changes: AttachmentChanges = {};

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const form = await c.req.formData();
    for (const kind of ATTACHMENT_KIND_ORDER) {
      const field = form.get(kind);
      const file = field instanceof File ? field : undefined;
      const remove = form.get(removeFieldName(kind)) === 'true';
      if (file || remove) changes[kind] = { file, remove };
    }
    return { rawContent: form.get('content'), changes };
  }

  const json = await c.req.json<Record<string, unknown>>();
  for (const kind of ATTACHMENT_KIND_ORDER) {
    if (json[removeFieldName(kind)] === true) changes[kind] = { remove: true };
  }
  return { rawContent: json.content, changes };
}

// 検証はすべて client 呼び出しの前に済ませる（途中で失敗してファイルが孤立しないように）
function attachmentsError(changes: AttachmentChanges): string | null {
  for (const kind of ATTACHMENT_KIND_ORDER) {
    const file = changes[kind]?.file;
    if (!file) continue;
    const error = validateAttachmentFile(kind, file);
    if (error) return error;
  }
  return null;
}

function validationError(c: Context, message: string): Response {
  return c.json({ error: { code: 'validation_error', message } }, 400);
}

itemsApp.get('/', async (c) => {
  try {
    const items = await client.listItems();
    return c.json({ items });
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.post('/', async (c) => {
  try {
    const { rawContent, changes } = await readItemRequest(c);
    const error = contentError(rawContent) ?? attachmentsError(changes);
    if (error) return validationError(c, error);

    const files: Partial<Record<AttachmentKind, File>> = {};
    for (const kind of ATTACHMENT_KIND_ORDER) {
      const file = changes[kind]?.file;
      if (file) files[kind] = file;
    }

    const item = await client.createItem(rawContent as string, files);
    c.header('Location', `/api/items/${item.id}`);
    return c.json({ item }, 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.put('/:id/review', async (c) => {
  const id = c.req.param('id');
  try {
    const json = await c.req.json<{ quality?: unknown }>();
    const quality = Number(json.quality);

    if (isNaN(quality) || quality < 0 || quality > 5) {
      return c.json(
        { error: { code: 'validation_error', message: 'Quality must be 0-5' } },
        400,
      );
    }

    const item = await client.reviewItem(id, quality);
    return c.json({ item });
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.put('/:id/master', async (c) => {
  const id = c.req.param('id');
  try {
    const item = await client.masterItem(id);
    return c.json({ item });
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.put('/:id/unmaster', async (c) => {
  const id = c.req.param('id');
  try {
    const item = await client.unmasterItem(id);
    return c.json({ item });
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.put('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const { rawContent, changes } = await readItemRequest(c);
    const error = contentError(rawContent) ?? attachmentsError(changes);
    if (error) return validationError(c, error);

    const item = await client.updateItem(id, rawContent as string, changes);
    return c.json({ item });
  } catch (err) {
    return errorResponse(c, err);
  }
});

itemsApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await client.deleteItem(id);
    return c.body(null, 204);
  } catch (err) {
    return errorResponse(c, err);
  }
});
