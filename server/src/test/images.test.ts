import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('../obsidian/client');

type ErrorResponse = { error: { code: string } };

import { Hono } from 'hono';
import { imagesApp } from '../routes/images';
import * as client from '../obsidian/client';

const testApp = new Hono();
testApp.route('/api/images', imagesApp);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/images/:filename', () => {
  it('画像バッファをContent-Typeヘッダーと共に返す', async () => {
    const buffer = new ArrayBuffer(8);
    (client.getImageBuffer as Mock).mockResolvedValue({
      buffer,
      contentType: 'image/jpeg',
    });

    const res = await testApp.request('/api/images/test-image.jpg');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/jpeg');
    expect(client.getImageBuffer).toHaveBeenCalledWith('test-image.jpg');
  });

  it('存在しない画像で404を返す', async () => {
    (client.getImageBuffer as Mock).mockRejectedValue(new Error('Image not found: missing.jpg'));

    const res = await testApp.request('/api/images/missing.jpg');

    expect(res.status).toBe(404);
    const data = await res.json() as ErrorResponse;
    expect(data.error.code).toBe('not_found');
  });

  it('Obsidianエラー時に500を返す', async () => {
    (client.getImageBuffer as Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await testApp.request('/api/images/test.jpg');

    expect(res.status).toBe(500);
  });
});
