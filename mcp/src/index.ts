#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

dotenv.config({ path: '/Users/ki/ifukazoo/repeatnote/.env' });

const API_URL =
  'https://repeatnote.ifukazoo.workers.dev/api/external/items';

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'CF_ACCESS_CLIENT_ID または CF_ACCESS_CLIENT_SECRET が .env に設定されていません',
    );
  }
  return { clientId, clientSecret };
}

const server = new McpServer({
  name: 'repeatnote',
  version: '1.0.0',
});

server.registerTool(
  'add_item',
  {
    description:
      'RepeatNote にアイテムを追加する。学習したいことや覚えたい情報を登録できる。',
    inputSchema: {
      content: z
        .string()
        .max(750)
        .describe('学習アイテムの内容（最大750文字）'),
      image_path: z
        .string()
        .optional()
        .describe('添付画像ファイルの絶対パス（省略可）'),
    },
  },
  async ({ content, image_path }) => {
    const { clientId, clientSecret } = getCredentials();

    const headers: Record<string, string> = {
      'CF-Access-Client-Id': clientId,
      'CF-Access-Client-Secret': clientSecret,
    };

    let response: Response;

    if (image_path) {
      const formData = new FormData();
      formData.append('content', content);

      const imageBuffer = fs.readFileSync(image_path);
      const ext = path.extname(image_path).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext] ?? 'application/octet-stream';
      const filename = path.basename(image_path);
      formData.append('image', new Blob([imageBuffer], { type: mimeType }), filename);

      response = await fetch(API_URL, { method: 'POST', headers, body: formData });
    } else {
      headers['Content-Type'] = 'application/json';
      response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      return {
        content: [
          {
            type: 'text' as const,
            text: `エラー: ${JSON.stringify(error)}`,
          },
        ],
      };
    }

    const result = await response.json() as { item: { id: number; content: string } };
    return {
      content: [
        {
          type: 'text' as const,
          text: `RepeatNote に追加しました（ID: ${result.item.id}）\n内容: ${result.item.content}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RepeatNote MCP サーバー起動');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
