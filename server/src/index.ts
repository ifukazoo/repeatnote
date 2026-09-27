import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { itemsApp } from './routes/items';
import { attachmentsApp } from './routes/attachments';

const app = new Hono();

app.route('/api/items', itemsApp);
app.route('/api/attachments', attachmentsApp);
// 旧 URL の互換用エイリアス
app.route('/api/images', attachmentsApp);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
});

app.use('/*', serveStatic({ root: '../frontend/dist' }));

app.notFound((c) => {
  const html = readFileSync(resolve(process.cwd(), '../frontend/dist/index.html'), 'utf-8');
  return c.html(html);
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`RepeatNote server running on http://localhost:${port}`);
});
