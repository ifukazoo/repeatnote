import type { MiddlewareHandler } from 'hono';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// Host が localhost 以外の要求を拒否する（DNS リバインディング対策）。
// 攻撃者のドメインを 127.0.0.1 に向け直されると Origin と Host が一致してしまうため、
// Origin チェックだけでは防げない
export const rejectForeignHost: MiddlewareHandler = async (c, next) => {
  const host = c.req.header('host') ?? '';
  let hostname: string | null = null;
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    // Host が不正な値
  }

  if (!hostname || !LOCAL_HOSTNAMES.has(hostname)) {
    return c.json({ error: { code: 'forbidden', message: 'Host not allowed' } }, 403);
  }
  return next();
};

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
