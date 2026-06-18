import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';

const app = new Hono();

const files = new Map<string, string>();

app.get('/vault/repeatnote/', (c) => {
  const fileList = Array.from(files.keys());
  return c.json({ files: fileList });
});

app.get('/vault/repeatnote/:path{.+}', (c) => {
  const path = c.req.param('path');
  const content = files.get(path);
  if (!content) return c.text('Not found', 404);
  return c.text(content);
});

app.put('/vault/repeatnote/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const body = await c.req.text();
  files.set(path, body);
  return c.text('', 204);
});

app.delete('/vault/repeatnote/:path{.+}', (c) => {
  const path = c.req.param('path');
  if (!files.has(path)) return c.text('Not found', 404);
  files.delete(path);
  return c.text('', 204);
});

let server: Server | null = null;

export function startMockObsidian(port: number): Promise<void> {
  return new Promise((resolve) => {
    server = serve({ fetch: app.fetch, port }, () => resolve());
  });
}

export function stopMockObsidian(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
    server = null;
  });
}

export function clearFiles(): void {
  files.clear();
}
