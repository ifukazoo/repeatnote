import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  reviewItem,
  masterItem,
  unmasterItem,
} from './database';
import type { CreateItemData, ReviewResult } from './database';
import { IMAGE_CONFIG } from './constants';

function jsonError(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateContent(content: string): Response | null {
  if (!content || content.trim() === '') return jsonError('Content is required');
  if (content.length > 750) return jsonError('Content too long (max 750 characters)');
  return null;
}

function parseItemFormData(
  formData: FormData,
): { content: string; imageFile: File | null } | Response {
  const contentEntry = formData.get('content');
  if (typeof contentEntry !== 'string') return jsonError('Invalid content type');
  const imageEntry = formData.get('image');
  if (imageEntry && !(imageEntry instanceof File)) return jsonError('Invalid image type');
  return { content: contentEntry, imageFile: imageEntry as File | null };
}

async function validateImageMagicBytes(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  switch (file.type) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case 'image/gif':
      return (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38
      );
    case 'image/webp':
      return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    default:
      return false;
  }
}

// 画像アップロードヘルパー
async function uploadImageToR2(
  env: Env,
  imageFile: File,
): Promise<{ imageUrl: string; imageFilename: string } | Response> {
  if (imageFile.size > IMAGE_CONFIG.MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Image too large (max 5MB)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const allowedTypes = Object.keys(IMAGE_CONFIG.SUPPORTED_IMAGE_TYPES);
  if (!allowedTypes.includes(imageFile.type)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid image format. Only JPEG, PNG, WebP, and GIF are allowed',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!(await validateImageMagicBytes(imageFile))) {
    return jsonError('Image content does not match declared type');
  }

  const timestamp = Date.now();
  const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  const extension =
    IMAGE_CONFIG.SUPPORTED_IMAGE_TYPES[
      imageFile.type as keyof typeof IMAGE_CONFIG.SUPPORTED_IMAGE_TYPES
    ];
  const imageFilename = `${timestamp}-${randomId}.${extension}`;

  try {
    await env.IMAGES.put(imageFilename, imageFile.stream(), {
      httpMetadata: { contentType: imageFile.type },
    });
    return { imageUrl: `/api/images/${imageFilename}`, imageFilename };
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Failed to upload image' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// API ルーター関数
async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname === '/api/items' && method === 'POST') {
      // POST /api/items - 新しいアイテムを登録（画像対応）
      const contentType = request.headers.get('content-type') || '';

      let itemData: CreateItemData;
      let imageUrl: string | null = null;
      let imageFilename: string | null = null;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const parsed = parseItemFormData(formData);
        if (parsed instanceof Response) return parsed;
        const { content, imageFile } = parsed;

        const contentError = validateContent(content);
        if (contentError) return contentError;

        if (imageFile && imageFile.size > 0) {
          const uploadResult = await uploadImageToR2(env, imageFile);
          if (uploadResult instanceof Response) return uploadResult;
          imageUrl = uploadResult.imageUrl;
          imageFilename = uploadResult.imageFilename;
        }

        itemData = { content: content.trim() };
      } else {
        const body = (await request.json()) as CreateItemData;
        const contentError = validateContent(body.content);
        if (contentError) return contentError;
        itemData = { content: body.content.trim() };
      }

      const newItem = await createItem(
        env.DB,
        itemData,
        imageUrl,
        imageFilename,
      );
      return new Response(JSON.stringify({ item: newItem }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname === '/api/external/items' && method === 'POST') {
      // POST /api/external/items - 外部APIからアイテムを追加（Cloudflare Access Service Authで認証）
      const contentType = request.headers.get('content-type') || '';
      let itemData: CreateItemData;
      let imageUrl: string | null = null;
      let imageFilename: string | null = null;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const parsed = parseItemFormData(formData);
        if (parsed instanceof Response) return parsed;
        const { content, imageFile } = parsed;

        const contentError = validateContent(content);
        if (contentError) return contentError;

        if (imageFile && imageFile.size > 0) {
          const uploadResult = await uploadImageToR2(env, imageFile);
          if (uploadResult instanceof Response) return uploadResult;
          imageUrl = uploadResult.imageUrl;
          imageFilename = uploadResult.imageFilename;
        }

        itemData = { content: content.trim() };
      } else {
        const body = (await request.json()) as CreateItemData;
        const contentError = validateContent(body.content);
        if (contentError) return contentError;
        itemData = { content: body.content.trim() };
      }

      const newItem = await createItem(env.DB, itemData, imageUrl, imageFilename);
      return new Response(JSON.stringify({ item: newItem }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/items\/\d+\/review$/) && method === 'PUT') {
      // PUT /api/items/:id/review - 復習処理を行い次回復習日を更新
      const idMatch = pathname.match(/^\/api\/items\/(\d+)\/review$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const itemId = parseInt(idMatch[1]);

      const body = (await request.json()) as ReviewResult;

      if (
        typeof body.quality !== 'number' ||
        body.quality < 0 ||
        body.quality > 5
      ) {
        return new Response(
          JSON.stringify({ error: 'Quality must be a number between 0 and 5' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      const updatedItem = await reviewItem(env.DB, itemId, body.quality);

      if (!updatedItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ item: updatedItem }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/items\/\d+\/master$/) && method === 'PUT') {
      // PUT /api/items/:id/master - アイテムを「覚えた」状態にマーク
      const idMatch = pathname.match(/^\/api\/items\/(\d+)\/master$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const itemId = parseInt(idMatch[1]);
      const masteredItem = await masterItem(env.DB, itemId);

      if (!masteredItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ item: masteredItem }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/items\/\d+\/unmaster$/) && method === 'PUT') {
      // PUT /api/items/:id/unmaster - アイテムの「覚えた」状態を解除
      const idMatch = pathname.match(/^\/api\/items\/(\d+)\/unmaster$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const itemId = parseInt(idMatch[1]);
      const unmasteredItem = await unmasterItem(env.DB, itemId);

      if (!unmasteredItem) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ item: unmasteredItem }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/items\/\d+$/) && method === 'PUT') {
      // PUT /api/items/:id - アイテムを更新（画像対応）
      const idMatch = pathname.match(/^\/api\/items\/(\d+)$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const itemId = parseInt(idMatch[1]);

      const contentType = request.headers.get('content-type') || '';
      let content: string;
      let newImageUrl: string | null = null;
      let newImageFilename: string | null = null;
      let shouldRemoveImage = false;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const parsed = parseItemFormData(formData);
        if (parsed instanceof Response) return parsed;
        const { content: parsedContent, imageFile } = parsed;

        shouldRemoveImage = formData.get('removeImage') === 'true';
        content = parsedContent;

        if (imageFile && imageFile.size > 0) {
          const uploadResult = await uploadImageToR2(env, imageFile);
          if (uploadResult instanceof Response) return uploadResult;
          newImageUrl = uploadResult.imageUrl;
          newImageFilename = uploadResult.imageFilename;
        }
      } else {
        // JSON形式（従来の処理）
        let requestData;
        try {
          requestData = (await request.json()) as { content: string };
        } catch (_e) {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        content = requestData.content;
      }

      const contentError = validateContent(content);
      if (contentError) return contentError;

      const updateResult = await updateItem(
        env.DB,
        itemId,
        content.trim(),
        newImageUrl,
        newImageFilename,
        shouldRemoveImage,
      );

      if (!updateResult.item) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 古い画像ファイルを削除（新しい画像がアップロードされた場合、または画像削除の場合）
      if (
        updateResult.oldImageFilename &&
        (newImageFilename || shouldRemoveImage)
      ) {
        try {
          await env.IMAGES.delete(updateResult.oldImageFilename);
        } catch (error) {
          console.error('Failed to delete old image from R2:', error);
          // 古い画像削除に失敗してもアイテム更新は成功として扱う
        }
      }

      return new Response(JSON.stringify({ item: updateResult.item }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/items\/\d+$/) && method === 'DELETE') {
      // DELETE /api/items/:id - アイテムを削除（画像も含む）
      const idMatch = pathname.match(/^\/api\/items\/(\d+)$/);
      if (!idMatch) {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const itemId = parseInt(idMatch[1]);

      const deleteResult = await deleteItem(env.DB, itemId);

      if (!deleteResult.success) {
        return new Response(JSON.stringify({ error: 'Item not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname.match(/^\/api\/images\/[^/]+$/) && method === 'GET') {
      // GET /api/images/:filename - 画像を取得
      const filenameMatch = pathname.match(/^\/api\/images\/([^/]+)$/);
      if (!filenameMatch) {
        return new Response('Invalid filename', { status: 400 });
      }
      const filename = filenameMatch[1];

      // Cache-Control ヘッダーだけでは Cloudflare エッジはキャッシュしないため
      // caches.default API で明示的にエッジキャッシュへ保存・取得する
      const cache = caches.default;
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const object = await env.IMAGES.get(filename);
        if (!object) {
          return new Response('Image not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000');

        const response = new Response(object.body, { headers });
        ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      } catch (_error) {
        return new Response('Failed to retrieve image', { status: 500 });
      }
    }

    // 該当するAPIエンドポイントがない場合
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_error) {
    // エラーハンドリング
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // API リクエストの処理
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    // API以外のリクエストは404を返す（静的アセットはCloudflareが処理）
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
