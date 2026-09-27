import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('../obsidian/client');

type ErrorResponse = { error: { code: string } };

import { Hono } from 'hono';
import { attachmentsApp } from '../routes/attachments';
import * as client from '../obsidian/client';

const testApp = new Hono();
testApp.route('/api/attachments', attachmentsApp);
testApp.route('/api/images', attachmentsApp);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/attachments/:filename', () => {
  it('拡張子から決めた Content-Type と nosniff を付けて返す', async () => {
    (client.getAttachment as Mock).mockResolvedValue(new ArrayBuffer(8));

    const res = await testApp.request('/api/attachments/test-image.jpg');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(client.getAttachment).toHaveBeenCalledWith('test-image.jpg');
  });

  it('大文字の拡張子でも取得できる', async () => {
    (client.getAttachment as Mock).mockResolvedValue(new ArrayBuffer(8));

    const res = await testApp.request('/api/attachments/photo.PNG');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it.each([
    ['svg', 'evil.svg'],
    ['拡張子なし', 'noext'],
    ['パストラバーサル', '..%2F..%2Fsecret.jpg'],
    ['ドットで始まる', '.hidden.jpg'],
  ])('配信できないファイル名（%s）は 400 を返し、Obsidian に問い合わせない', async (_, filename) => {
    const res = await testApp.request(`/api/attachments/${filename}`);

    expect(res.status).toBe(400);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error.code).toBe('validation_error');
    expect(client.getAttachment).not.toHaveBeenCalled();
  });

  it('存在しない画像で404を返す', async () => {
    (client.getAttachment as Mock).mockRejectedValue(new Error('Attachment not found: missing.jpg'));

    const res = await testApp.request('/api/attachments/missing.jpg');

    expect(res.status).toBe(404);
    const data = (await res.json()) as ErrorResponse;
    expect(data.error.code).toBe('not_found');
  });

  it('Obsidianエラー時に500を返す', async () => {
    (client.getAttachment as Mock).mockRejectedValue(new Error('Connection refused'));

    const res = await testApp.request('/api/attachments/test.jpg');

    expect(res.status).toBe(500);
  });

  it('旧 URL /api/images/:filename でも取得できる', async () => {
    (client.getAttachment as Mock).mockResolvedValue(new ArrayBuffer(8));

    const res = await testApp.request('/api/images/test-image.jpg');

    expect(res.status).toBe(200);
  });
});
