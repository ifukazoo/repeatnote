# RepeatNote — Tech Stack

## Architecture Overview

React SPA + Cloudflare Workers のモノレポ構成。フロントエンドの静的ファイルと REST API を同一 Worker として配信する。

```
Browser (React SPA)
    ↕ fetch /api/*
Cloudflare Workers (TypeScript)
    ├── Cloudflare D1 (SQLite) — メインデータ
    └── Cloudflare R2            — 画像ストレージ
```

---

## Frontend

| | |
|---|---|
| Language | TypeScript |
| Framework | React 19 |
| Build | Vite 7 |
| Hosting | Cloudflare Workers Static Assets (SPA fallback) |

---

## Backend

| | |
|---|---|
| Runtime | Cloudflare Workers (V8 isolate) |
| Language | TypeScript |
| API Style | REST (JSON / FormData) |
| Database | Cloudflare D1 (SQLite) |
| Object Storage | Cloudflare R2 |
| External Auth | Cloudflare Access Service Token |

---

## Deployment

| | |
|---|---|
| CLI | Wrangler 4 |
| Command | `npm run build && wrangler deploy` |
| Production URL | https://repeatnote.ifukazoo.workers.dev |

---

## Testing

| | |
|---|---|
| Runner | Vitest |
| Component | React Testing Library |
| Environment | jsdom |

---

## Development Concerns

### Image serving via Worker
`GET /api/images/:filename` は Worker が R2 から読み取って返す構成のため、画像リクエストのたびに Worker の CPU 時間を消費し CDN キャッシュが効かない。R2 パブリックアクセス URL またはカスタムドメイン + Cache Rules を使うのが望ましい。

### D1 write scalability
D1（SQLite）は単一ライター制約があるため、複数ユーザーに開放する場合は書き込みがボトルネックになる。スケールが必要になれば Hyperdrive + PostgreSQL への移行を検討する。

---

## Development Process Improvements

### Staging environment
現状 master が即 production。`wrangler.jsonc` に環境を追加するだけでステージングを持てる。スキーマ変更や大きな機能追加時のリスクを下げられる。

### Rollback procedure
`wrangler rollback` で直前のデプロイに戻せる。手順を把握しておくことで、障害時の復旧コストを最小化できる。

### D1 migration management
現状 `schema.sql` を手動実行する運用でスキーマ変更履歴が残らない。`migrations/001_add_column.sql` のように連番ファイルで管理すると本番適用済みかどうかの混乱を防げる。

### Implementation approval granularity
現在は全変更に事前確認を要求しているが、軽微な修正には過剰。「設計変更・DB変更は確認、軽微な修正は裁量で進める」のように粒度を分けると反復速度と安全性のバランスが取れる。

### Worker tests against real D1
`worker/index.test.ts` が D1・R2 をモックしている場合、スキーマ変更後に「テストは通るが本番では壊れる」状況が起きやすい。Wrangler の `--local` オプションでローカル D1 に対してテストを実行することで、モックと本番の乖離リスクを減らせる。

### External Auth: Service Token は過剰だった

`/api/external/items` の認証に Cloudflare Access Service Token を採用したが、このエンドポイントは外部公開しておらず MCP 経由でのみ使用し、利用者も自分のみ。Bearer トークン（`wrangler secret put` でシークレット登録）で十分だった。Service Token は「`/` 全体を Google 認証で保護しつつ機械間通信の穴を空ける」構成の複雑さに見合うメリットが得られていない。

### E2E smoke test for golden path
「デプロイ前に手動確認」がゲートになっているが確認内容が定義されておらず抜け漏れが出やすい。Playwright でアイテム追加→レビュー→削除の一連のフローを1本 E2E テストとして持つだけで手動確認を代替できる。Playwright MCP がすでに環境にあるため導入コストは低い。
