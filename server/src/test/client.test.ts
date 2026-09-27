import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as client from '../obsidian/client';

// Obsidian Local REST API をメモリ上の vault で置き換える
const BASE = 'http://127.0.0.1:27123/vault/repeatnote/';
let files: Map<string, string>;
let calls: string[];
let failPut: ((path: string) => boolean) | null;

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const path = decodeURIComponent(url.slice(BASE.length));
  const method = init?.method ?? 'GET';
  calls.push(`${method} ${path}`);

  if (method === 'PUT') {
    if (failPut?.(path)) return Promise.resolve(new Response('', { status: 500 }));
    files.set(path, typeof init?.body === 'string' ? init.body : '<binary>');
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  if (method === 'DELETE') {
    if (!files.has(path)) return Promise.resolve(new Response('', { status: 404 }));
    files.delete(path);
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  if (path === '') {
    return Promise.resolve(Response.json({ files: Array.from(files.keys()) }));
  }
  const body = files.get(path);
  if (body === undefined) return Promise.resolve(new Response('', { status: 404 }));
  return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain' } }));
}

const ITEM_MD = `---
aliases:
  - "本文"
created_at: 2026-01-01T00:00:00.000Z
interval_days: 1
ease_factor: 2.5
review_count: 0
next_review: 2026-01-02
mastered: false
---

本文

![[old.png]]`;

function jpeg(name = 'photo.jpg'): File {
  return new File(['x'], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  files = new Map();
  calls = [];
  failPut = null;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createItem', () => {
  it('添付をアップロードしてから md を書き込む', async () => {
    const item = await client.createItem('本文', { image: jpeg() });

    expect(item.attachments.image).toMatch(/\.jpg$/);
    expect(files.has(`attachments/${item.attachments.image}`)).toBe(true);
    expect(files.get(`${item.id}.md`)).toContain(`![[${item.attachments.image}]]`);
  });

  it('md の書き込みに失敗したら、アップロード済みの添付を削除する', async () => {
    failPut = (path) => path.endsWith('.md');

    await expect(client.createItem('本文', { image: jpeg() })).rejects.toThrow();
    expect(Array.from(files.keys())).toEqual([]);
  });
});

describe('updateItem', () => {
  beforeEach(() => {
    files.set('item-1.md', ITEM_MD);
    files.set('attachments/old.png', '<binary>');
  });

  it('差し替えは「新ファイル PUT → md PUT → 旧ファイル削除」の順で行う', async () => {
    const item = await client.updateItem('item-1', '本文', { image: { file: jpeg() } });

    const newPath = `attachments/${item.attachments.image}`;
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual([
      `PUT ${newPath}`,
      'PUT item-1.md',
      'DELETE attachments/old.png',
    ]);
    expect(files.has('attachments/old.png')).toBe(false);
  });

  it('md の書き込みに失敗したら、旧ファイルを残して新ファイルを削除する', async () => {
    failPut = (path) => path.endsWith('.md');

    await expect(
      client.updateItem('item-1', '本文', { image: { file: jpeg() } }),
    ).rejects.toThrow();
    expect(Array.from(files.keys()).sort()).toEqual(['attachments/old.png', 'item-1.md']);
  });

  it('削除を指示すると添付を外して旧ファイルを削除する', async () => {
    const item = await client.updateItem('item-1', '本文', { image: { remove: true } });

    expect(item.attachments).toEqual({});
    expect(files.has('attachments/old.png')).toBe(false);
    expect(files.get('item-1.md')).not.toContain('![[');
  });

  it('添付の変更がなければ既存の添付を保持する', async () => {
    const item = await client.updateItem('item-1', '更新後', {});

    expect(item.attachments).toEqual({ image: 'old.png' });
    expect(files.has('attachments/old.png')).toBe(true);
  });
});

describe('deleteItem', () => {
  it('md を削除してから添付を削除する', async () => {
    files.set('item-1.md', ITEM_MD);
    files.set('attachments/old.png', '<binary>');

    await client.deleteItem('item-1');

    expect(calls.filter((c) => c.startsWith('DELETE'))).toEqual([
      'DELETE item-1.md',
      'DELETE attachments/old.png',
    ]);
    expect(files.size).toBe(0);
  });
});

describe('review / master / unmaster', () => {
  beforeEach(() => {
    files.set('item-1.md', ITEM_MD);
  });

  it('review 後も添付が残る', async () => {
    await client.reviewItem('item-1', 5);
    expect(files.get('item-1.md')).toContain('![[old.png]]');
  });

  it('master / unmaster 後も添付が残る', async () => {
    await client.masterItem('item-1');
    expect(files.get('item-1.md')).toContain('![[old.png]]');
    await client.unmasterItem('item-1');
    expect(files.get('item-1.md')).toContain('![[old.png]]');
  });
});
