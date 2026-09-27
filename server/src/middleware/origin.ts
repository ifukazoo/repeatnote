import type { MiddlewareHandler } from 'hono';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// 他オリジンからの書き込みを拒否する（CSRF 対策）。
// sandbox iframe 内の artifact は Origin: null になるため、ここで弾かれる。
// Origin を送らないクライアント（MCP サーバー、curl）はそのまま通す
export const rejectCrossOriginWrites: MiddlewareHandler = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const origin = c.req.header('origin');
  if (origin === undefined) return next();

  const host = c.req.header('host');
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // Origin: null など URL として解釈できない値
  }

  if (!host || originHost !== host) {
    return c.json({ error: { code: 'forbidden', message: 'Cross-origin request rejected' } }, 403);
  }
  return next();
};
