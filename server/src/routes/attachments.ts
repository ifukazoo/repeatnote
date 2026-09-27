import { Hono } from 'hono';
import * as client from '../obsidian/client';
import { isServableFilename, responseHeaders } from '../attachments';

export const attachmentsApp = new Hono();

attachmentsApp.get('/:filename', async (c) => {
  const filename = c.req.param('filename');
  if (!isServableFilename(filename)) {
    return c.json({ error: { code: 'validation_error', message: 'Invalid filename' } }, 400);
  }
  try {
    const buffer = await client.getAttachment(filename);
    return new Response(buffer, { headers: responseHeaders(filename) });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
      return c.json({ error: { code: 'not_found', message: err.message } }, 404);
    }
    console.error(err);
    return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
  }
});
