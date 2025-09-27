import { getItems, createItem, updateItem, deleteItem, reviewItem } from './database';
import type { CreateItemData, ReviewResult } from './database';

// API ルーター関数
async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Same-Origin配信のためCORS不要 (フロントエンドとAPIが同一Worker)

  try {
    // API エンドポイントのルーティング
    if (pathname === '/api/items' && method === 'GET') {
      // GET /api/items - アイテム一覧を取得
      const items = await getItems(env.DB);
      return new Response(JSON.stringify({ items }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/api/items' && method === 'POST') {
      // POST /api/items - 新しいアイテムを登録（画像対応）
      const contentType = request.headers.get('content-type') || '';

      let itemData: CreateItemData;
      let imageUrl: string | null = null;
      let imageFilename: string | null = null;

      if (contentType.includes('multipart/form-data')) {
        // FormDataから画像とテキストを処理
        const formData = await request.formData();

        // 型安全なFormData処理
        const contentEntry = formData.get('content');
        if (typeof contentEntry !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid content type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const imageEntry = formData.get('image');
        if (imageEntry && !(imageEntry instanceof File)) {
          return new Response(JSON.stringify({ error: 'Invalid image type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const content = contentEntry;
        const imageFile = imageEntry as File | null; // 型ガードで安全性確保済み

        if (!content || content.trim() === '') {
          return new Response(JSON.stringify({ error: 'Content is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (content.length > 750) {
          return new Response(JSON.stringify({ error: 'Content too long (max 750 characters)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // 画像アップロード処理
        if (imageFile && imageFile.size > 0) {
          // 画像サイズ制限 (5MB)
          if (imageFile.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'Image too large (max 5MB)' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // サポートする画像形式の定義
          const SUPPORTED_IMAGE_TYPES = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
          } as const;

          // 画像形式チェック
          const allowedTypes = Object.keys(SUPPORTED_IMAGE_TYPES);
          if (!allowedTypes.includes(imageFile.type)) {
            return new Response(JSON.stringify({ error: 'Invalid image format. Only JPEG, PNG, WebP, and GIF are allowed' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 一意のファイル名を生成
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2);

          // MIMEタイプから安全な拡張子を決定
          const extension = SUPPORTED_IMAGE_TYPES[imageFile.type as keyof typeof SUPPORTED_IMAGE_TYPES];
          imageFilename = `${timestamp}-${randomId}.${extension}`;

          try {
            // R2に画像をアップロード
            await env.IMAGES.put(imageFilename, imageFile.stream(), {
              httpMetadata: {
                contentType: imageFile.type,
              }
            });

            // 画像のURLを生成 (同一ドメインでアクセス可能)
            imageUrl = `/api/images/${imageFilename}`;
          } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }

        itemData = { content: content.trim() };
      } else {
        // JSON形式（従来の処理）
        const body = await request.json() as CreateItemData;

        if (!body.content || body.content.trim() === '') {
          return new Response(JSON.stringify({ error: 'Content is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (body.content.length > 750) {
          return new Response(JSON.stringify({ error: 'Content too long (max 750 characters)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        itemData = { content: body.content.trim() };
      }

      const newItem = await createItem(env.DB, itemData, imageUrl, imageFilename);
      return new Response(JSON.stringify({ item: newItem }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/items\/\d+\/review$/) && method === 'PUT') {
      // PUT /api/items/:id/review - 復習処理を行い次回復習日を更新
      const idMatch = pathname.match(/^\/api\/items\/(\d+)\/review$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const itemId = parseInt(idMatch[1]);

      const body = await request.json() as ReviewResult;

      if (typeof body.quality !== 'number' || body.quality < 0 || body.quality > 5) {
        return new Response(JSON.stringify({ error: 'Quality must be a number between 0 and 5' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updatedItem = await reviewItem(env.DB, itemId, body.quality);

      if (!updatedItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ item: updatedItem }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/items\/\d+$/) && method === 'PUT') {
      // PUT /api/items/:id - アイテムを更新
      const idMatch = pathname.match(/^\/api\/items\/(\d+)$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const itemId = parseInt(idMatch[1]);

      let requestData;
      try {
        requestData = await request.json() as { content: string };
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // バリデーション
      if (!requestData.content || requestData.content.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (requestData.content.length > 750) {
        return new Response(JSON.stringify({ error: 'Content too long (max 750 characters)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updatedItem = await updateItem(env.DB, itemId, requestData.content.trim());

      if (!updatedItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ item: updatedItem }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/items\/\d+$/) && method === 'DELETE') {
      // DELETE /api/items/:id - アイテムを削除（画像も含む）
      const idMatch = pathname.match(/^\/api\/items\/(\d+)$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const itemId = parseInt(idMatch[1]);

      const deleteResult = await deleteItem(env.DB, itemId);

      if (!deleteResult.success) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // R2から画像を削除
      if (deleteResult.imageFilename) {
        try {
          await env.IMAGES.delete(deleteResult.imageFilename);
        } catch (error) {
          console.error('Failed to delete image from R2:', error);
          // 画像削除に失敗してもアイテム削除は成功として扱う
        }
      }

      return new Response(JSON.stringify({ message: 'Item deleted' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.match(/^\/api\/images\/[^\/]+$/) && method === 'GET') {
      // GET /api/images/:filename - 画像を取得
      const filenameMatch = pathname.match(/^\/api\/images\/([^\/]+)$/);
      if (!filenameMatch) {
        return new Response('Invalid filename', { status: 400 });
      }
      const filename = filenameMatch[1];

      try {
        const object = await env.IMAGES.get(filename);
        if (!object) {
          return new Response('Image not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000'); // 1年キャッシュ

        return new Response(object.body, { headers });
      } catch (error) {
        return new Response('Failed to retrieve image', { status: 500 });
      }
    }

    // 該当するAPIエンドポイントがない場合
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // エラーハンドリング
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
