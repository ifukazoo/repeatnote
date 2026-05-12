#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
const API_URL = 'http://localhost:3001/api/items';
const server = new McpServer({
    name: 'repeatnote',
    version: '1.0.0',
});
server.registerTool('add_item', {
    description: 'RepeatNote にアイテムを追加する。学習したいことや覚えたい情報を登録できる。',
    inputSchema: {
        content: z
            .string()
            .max(1000)
            .describe('学習アイテムの内容（最大1000文字）。Markdown形式（太字、箇条書き、コードブロックなど）もそのまま登録できる。'),
        image_path: z
            .string()
            .optional()
            .describe('添付画像ファイルの絶対パス（省略可）'),
    },
}, async ({ content, image_path }) => {
    let response;
    if (image_path) {
        const formData = new FormData();
        formData.append('content', content);
        const imageBuffer = fs.readFileSync(image_path);
        const ext = path.extname(image_path).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
        };
        const mimeType = mimeTypes[ext] ?? 'application/octet-stream';
        const filename = path.basename(image_path);
        formData.append('image', new Blob([imageBuffer], { type: mimeType }), filename);
        response = await fetch(API_URL, { method: 'POST', body: formData });
    }
    else {
        response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
            content: [
                {
                    type: 'text',
                    text: `エラー: ${error.error?.message ?? JSON.stringify(error)}`,
                },
            ],
        };
    }
    const result = (await response.json());
    return {
        content: [
            {
                type: 'text',
                text: `RepeatNote に追加しました（ID: ${result.item.id}）\n内容: ${result.item.content}`,
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('RepeatNote MCP サーバー起動');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
