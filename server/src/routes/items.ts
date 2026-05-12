import { Hono } from 'hono';
import type { Context } from 'hono';
import * as client from '../obsidian/client';

export const itemsApp = new Hono();

function errorResponse(c: Context, err: unknown): Response {
  if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
    return c.json({ error: { code: 'not_found', message: err.message } }, 404);
  }
  console.error(err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
}

function validateContent(content: unknown): string | null {
  if (typeof content !== 'string' || content.trim().length === 0) return null;
  if (content.length > 1000) return null;
  return content;
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
    const contentType = c.req.header('content-type') ?? '';
    let rawContent: unknown;
    let imageFile: File | undefined;

    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const form = await c.req.formData();
      rawContent = form.get('content');
      const imageField = form.get('image');
      imageFile = imageField instanceof File ? imageField : undefined;
    } else {
      const json = await c.req.json<{ content?: unknown }>();
      rawContent = json.content;
    }

    const content = validateContent(rawContent);
    if (content === null) {
      if (typeof rawContent === 'string' && rawContent.length > 1000) {
        return c.json(
          { error: { code: 'validation_error', message: 'Content exceeds 1000 characters' } },
          400,
        );
      }
      return c.json(
        { error: { code: 'validation_error', message: 'Content is required' } },
        400,
      );
    }

    const item = await client.createItem(content, imageFile);
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
    const contentType = c.req.header('content-type') ?? '';
    let rawContent: unknown;
    let imageFile: File | undefined;
    let removeImage = false;

    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const form = await c.req.formData();
      rawContent = form.get('content');
      const imageField = form.get('image');
      imageFile = imageField instanceof File ? imageField : undefined;
      removeImage = form.get('removeImage') === 'true';
    } else {
      const json = await c.req.json<{ content?: unknown; removeImage?: boolean }>();
      rawContent = json.content;
      removeImage = json.removeImage === true;
    }

    const content = validateContent(rawContent);
    if (content === null) {
      if (typeof rawContent === 'string' && rawContent.length > 1000) {
        return c.json(
          { error: { code: 'validation_error', message: 'Content exceeds 1000 characters' } },
          400,
        );
      }
      return c.json(
        { error: { code: 'validation_error', message: 'Content is required' } },
        400,
      );
    }

    const item = await client.updateItem(id, content, imageFile, removeImage);
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
