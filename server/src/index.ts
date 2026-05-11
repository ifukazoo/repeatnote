import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { itemsApp } from './routes/items';
import { imagesApp } from './routes/images';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.route('/api/items', itemsApp);
app.route('/api/images', imagesApp);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`RepeatNote API server running on http://localhost:${port}`);
});
