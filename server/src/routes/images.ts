import { Hono } from 'hono';
import * as client from '../obsidian/client';

export const imagesApp = new Hono();

imagesApp.get('/:filename', async (c) => {
  const filename = c.req.param('filename');
  try {
    const { buffer, contentType } = await client.getImageBuffer(filename);
    return new Response(buffer, {
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
      return c.json({ error: { code: 'not_found', message: err.message } }, 404);
    }
    console.error(err);
    return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
  }
});
