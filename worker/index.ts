import { getItems, createItem, deleteItem, reviewItem } from './database';
import type { CreateItemData, ReviewResult } from './database';

// API ルーター関数
async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS リクエスト（CORS プリフライト）への対応
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // API エンドポイントのルーティング
    if (pathname === '/api/items' && method === 'GET') {
      // GET /api/items - アイテム一覧を取得
      const items = await getItems(env.DB);
      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/api/items' && method === 'POST') {
      // POST /api/items - 新しいアイテムを登録
      const body = await request.json() as CreateItemData;

      if (!body.content || body.content.trim() === '') {
        return new Response(JSON.stringify({ error: 'Content is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newItem = await createItem(env.DB, { content: body.content.trim() });
      return new Response(JSON.stringify({ item: newItem }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/items\/\d+\/review$/) && method === 'PUT') {
      // PUT /api/items/:id/review - 復習処理を行い次回復習日を更新
      const idMatch = pathname.match(/^\/api\/items\/(\d+)\/review$/);
      const itemId = parseInt(idMatch![1]);

      const body = await request.json() as ReviewResult;

      if (typeof body.quality !== 'number' || body.quality < 0 || body.quality > 5) {
        return new Response(JSON.stringify({ error: 'Quality must be a number between 0 and 5' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const updatedItem = await reviewItem(env.DB, itemId, body.quality);

      if (!updatedItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ item: updatedItem }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/items\/\d+$/) && method === 'DELETE') {
      // DELETE /api/items/:id - アイテムを削除
      const idMatch = pathname.match(/^\/api\/items\/(\d+)$/);
      const itemId = parseInt(idMatch![1]);

      const deleted = await deleteItem(env.DB, itemId);

      if (!deleted) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ message: 'Item deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 該当するAPIエンドポイントがない場合
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // エラーハンドリング
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API リクエストの処理
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env);
    }

    // API以外のリクエストは404を返す（静的アセットはCloudflareが処理）
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
