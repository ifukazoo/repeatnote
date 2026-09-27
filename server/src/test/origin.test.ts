import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { rejectCrossOriginWrites } from '../middleware/origin';

const app = new Hono();
app.use('/api/*', rejectCrossOriginWrites);
app.get('/api/items', (c) => c.json({ ok: true }));
app.post('/api/items', (c) => c.json({ ok: true }));
app.delete('/api/items/:id', (c) => c.body(null, 204));

function request(method: string, origin?: string) {
  const headers: Record<string, string> = { Host: 'localhost:3001' };
  if (origin !== undefined) headers.Origin = origin;
  return app.request('http://localhost:3001/api/items' + (method === 'DELETE' ? '/x' : ''), {
    method,
    headers,
  });
}

describe('rejectCrossOriginWrites', () => {
  it('Origin のない書き込み（MCP・curl）は通す', async () => {
    expect((await request('POST')).status).toBe(200);
  });

  it('同一オリジンからの書き込みは通す', async () => {
    expect((await request('POST', 'http://localhost:3001')).status).toBe(200);
  });

  it('sandbox iframe（Origin: null）からの書き込みは 403', async () => {
    const res = await request('POST', 'null');
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('forbidden');
  });

  it('他オリジンからの書き込みは 403', async () => {
    expect((await request('POST', 'https://evil.example')).status).toBe(403);
    expect((await request('DELETE', 'https://evil.example')).status).toBe(403);
  });

  it('ポートが違えば他オリジンとして扱う', async () => {
    expect((await request('POST', 'http://localhost:5173')).status).toBe(403);
  });

  it('GET は Origin に関係なく通す', async () => {
    expect((await request('GET', 'null')).status).toBe(200);
  });
});
