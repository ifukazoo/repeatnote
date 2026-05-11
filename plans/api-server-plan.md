# RepeatNote API サーバー導入計画

作成日: 2026-05-11

## 背景・方針転換の理由

`feature/obsidian-local-storage` ブランチでは Cloudflare Worker 廃止に伴い SM-2 ロジックをフロントエンドへ移動した。
しかしこの設計では、ブラウザ以外のクライアント（MCP サーバー・将来のモバイルアプリ等）がそれぞれビジネスロジックを持つ必要が生じる。
そのため、ローカルで常駐する Hono API サーバーを新設し、すべてのクライアントはこれを経由する構成に変更する。

## 新アーキテクチャ

```
[ブラウザ: React App]          ─┐
[MCP サーバー (Claude Desktop)] ─┤→ [Hono API Server :3001] → [Obsidian Local REST API :27123] → [Vault *.md]
[将来のクライアント]            ─┘
```

### 旧アーキテクチャとの比較

| 項目 | 旧（Cloudflare）| 現在（feature ブランチ）| 新（本計画）|
|------|----------------|------------------------|------------|
| API サーバー | Cloudflare Worker | なし（フロントエンドが直接） | Hono（ローカル :3001）|
| ストレージ | D1 / R2 | Obsidian vault | Obsidian vault |
| SM-2 ロジック | Worker | フロントエンド | Hono サーバー |
| MCP | Worker 経由 | 壊れている | Hono 経由 |

---

## フェーズ構成

### Phase 0: ブランチ準備

1. `master` から新ブランチ `feature/local-api-server` を作成
2. `feature/obsidian-local-storage` から cherry-pick するコミットを選定・適用

**cherry-pick 候補**:

| コミット | 内容 | 判断 |
|---------|------|------|
| `1807d96` | データ移行スクリプト (scripts/migrate-from-cloudflare.mjs) | ✅ 採用 |
| `7bc784e` | Obsidian REST API クライアント実装 (src/obsidian/) | ✅ 採用（サーバー側へ移植する素材として）|
| `1f32b66` | SM-2 をフロントエンドへ移動 | ❌ 不採用（サーバーに置く）|
| `aa07a70` | api.ts を Obsidian アダプターに差し替え | ❌ 不採用（フロントは Hono API を呼ぶ）|
| `5e0650d` | Worker 廃止・Cloudflare 依存削除 | ❌ 不採用（新ブランチで段階的に対応）|

---

### Phase 0.5: スキル・ドキュメント読み込み

実装開始前に以下を読み込む。

**プロジェクトスキル** (`.claude/skills/`):

| スキル | 使用フェーズ |
|--------|------------|
| `tdd-workflow` | Phase 1〜3 全般（RED → GREEN → refactor サイクル）|
| `api-design` | Phase 1（Hono サーバー設計・エンドポイント設計）|
| `mcp-server-patterns` | Phase 3（MCP サーバー修正）|
| `frontend-patterns` | Phase 2（フロントエンド修正）|
| `deploy` | 対象外（Cloudflare Workers 用のため使用しない）|

**context7 ドキュメント**:

```
# Hono（Phase 1 実装前）
mcp__context7__resolve-library-id → "hono"
mcp__context7__query-docs → routing, middleware, multipart, Node.js adapter

# @modelcontextprotocol/sdk（Phase 3 実装前）
mcp__context7__resolve-library-id → "@modelcontextprotocol/sdk"
mcp__context7__query-docs → registerTool, StdioServerTransport
```

---

### Phase 1: Hono API サーバー構築

**目標**: `server/` ディレクトリに Hono サーバーを新設する

#### ディレクトリ構成

```
server/
├── src/
│   ├── index.ts            # エントリーポイント・ルーティング
│   ├── sm2.ts              # SM-2 アルゴリズム
│   ├── obsidian/
│   │   ├── client.ts       # Obsidian Local REST API クライアント
│   │   └── parser.ts       # .md ↔ Item 変換
│   └── routes/
│       ├── items.ts        # アイテム CRUD
│       └── images.ts       # 画像 proxy
├── src/test/
│   ├── sm2.test.ts
│   ├── parser.test.ts
│   └── items.test.ts
├── package.json
└── tsconfig.json
```

#### API エンドポイント

Worker の既存エンドポイントに合わせる（`api-design` スキルの HTTP メソッド・ステータスコード規約を適用）。

| メソッド | パス | 成功時 | 機能 |
|---------|------|--------|------|
| GET | /api/items | 200 | アイテム一覧取得 |
| POST | /api/items | 201 + Location | アイテム作成（multipart 画像対応）|
| PUT | /api/items/:id | 200 | アイテム更新（multipart 画像対応）|
| DELETE | /api/items/:id | 204 | アイテム削除 |
| PUT | /api/items/:id/review | 200 | レビュー（SM-2 計算）|
| PUT | /api/items/:id/master | 200 | マスター済みにする |
| PUT | /api/items/:id/unmaster | 200 | マスター解除 |
| GET | /api/images/:filename | 200 | 画像取得（Obsidian から proxy）|

#### レスポンス形式

```typescript
// 成功（単一リソース）
{ item: Item }

// 成功（一覧）
{ items: Item[] }

// エラー
{
  error: {
    code: string;      // 例: "not_found", "validation_error"
    message: string;
  }
}
```

#### 入力バリデーション

Zod でリクエストボディ・パラメータをバリデーション。

```typescript
const createItemSchema = z.object({
  content: z.string().min(1).max(1000),
});
```

#### 認証・設定

- Obsidian API キーは `server/.env` に `OBSIDIAN_API_KEY` として保存
- クライアントからの認証不要（localhost のみバインド）
- `.env.example` を作成してテンプレートを提供

#### launchd 設定

Mac ログイン時に Hono サーバーを自動起動:
- plist: `~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist`
- ログ: `~/Library/Logs/repeatnote-api.log`

#### TDD サイクル（`tdd-workflow` スキルに従う）

各エンドポイントについて以下を繰り返す:

1. ユーザージャーニーを記述
2. テストを先に書いて RED を確認（コミット: `test: add reproducer for ...`）
3. 最小実装で GREEN にする（コミット: `feat: ...`）
4. リファクタリング（コミット: `refactor: ...`）
5. カバレッジ 80%+ を維持

---

### Phase 2: フロントエンド修正

**目標**: `src/api.ts` の接続先を Hono API サーバーに変更する

#### 変更内容

- `src/api.ts` のベース URL を `http://localhost:3001` に変更
- Cloudflare Access 認証ヘッダー（`CF-Access-Client-Id` 等）を削除
- `src/sm2.ts` を削除（サーバー側で計算するため不要）
- `src/obsidian/` ディレクトリを削除（サーバーに移動済み）
- `useObsidianImage` フックを削除（`GET /api/images/:filename` 経由に変更）

#### 画像 URL の扱い

旧: フロントエンドが Bearer 認証付きで Obsidian から直接 fetch → blob URL
新: `http://localhost:3001/api/images/:filename` から取得（認証不要）

---

### Phase 3: MCP サーバー修正

**目標**: `mcp/src/index.ts` を Hono API サーバー経由に変更する

#### 変更内容（`mcp-server-patterns` スキルに従う）

- API URL を `http://localhost:3001/api/items` に変更
- Cloudflare Access 認証を削除
- SM-2・Markdown 生成ロジックの inline 実装を削除（サーバーが担うため）
- 画像送信は multipart で Hono サーバーに POST
- Zod スキーマは現行のまま維持

---

### Phase 4: ドキュメント・インフラ整備

1. `CLAUDE.md` のアーキテクチャ図・説明を新構成に更新
2. `TODO.md` の更新（プロジェクトルート整理タスクは残す）
3. `server/.env.example` を作成
4. `architecture.drawio` を更新

---

## 実装順序

```
Phase 0  ブランチ作成・cherry-pick
  └→ Phase 0.5  スキル・ドキュメント読み込み
       └→ Phase 1  Hono サーバー構築（TDD）
            └→ Phase 2  フロントエンド修正（TDD）
                 └→ Phase 3  MCP サーバー修正（TDD）
                      └→ Phase 4  ドキュメント整備
```

## 完了条件

- [ ] `http://localhost:3001/api/items` でアイテム一覧が返る
- [ ] フロントエンドが Hono API 経由でアイテムの CRUD・レビュー・マスターができる
- [ ] MCP サーバーの `add_item` が Hono API 経由でアイテムを追加できる
- [ ] Mac ログイン時に Hono サーバーが自動起動する
- [ ] サーバー側テストカバレッジ 80%+ を達成
- [ ] 既存フロントエンドテスト（69 件）が通る
