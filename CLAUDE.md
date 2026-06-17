# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## External Services

- Before implementing features that use Obsidian Local REST API, check the plugin documentation for correct endpoints and authentication patterns.

## Development Commands

### フロントエンド（`frontend/` ディレクトリ）

- `cd frontend && npm run dev` - Start development server with Vite HMR (port 5173)
- `cd frontend && npm run build` - Build the project (TypeScript compilation + Vite build)
- `cd frontend && npm run lint` - Run ESLint on the codebase
- `cd frontend && npm test` - Run unit tests in watch mode with Vitest
- `cd frontend && npm run test:run` - Run TypeScript type check + all unit tests once
- `cd frontend && npm run test:ui` - Run tests with Vitest UI interface
- `cd frontend && npm run preview` - ビルド済みファイルを port 4173 で確認（開発用途のみ。本番は Hono サーバーが配信）

### API サーバー（`server/` ディレクトリ）

- `cd server && npm start` - サーバー起動（tsx で `src/index.ts` を実行）
- `cd server && npm run dev` - 開発用（tsx watch モード）
- `cd server && npm run lint` - Run ESLint on the codebase
- `cd server && npm run test:run` - 型チェック（tsc --noEmit）＋サーバー側テストを実行

## Application Architecture

**RepeatNote** is a spaced repetition learning application implementing the SM-2 algorithm for optimal memory retention. Built with React + TypeScript + Vite frontend and a local Hono API server, using Obsidian Local REST API as the backend storage layer.

### Core Functionality

- **Spaced Repetition**: SM-2 algorithm calculates optimal review intervals based on recall quality (0-5 scale)
- **Learning Items**: Create, edit, and delete study items with 1000-character limit
- **Image Support**: Upload, edit, and delete images (JPEG/PNG/WebP/GIF, 5MB limit) stored in Obsidian vault `attachments/`
- **Review System**: Quality-based evaluation with visual feedback (😵 忘れた, 🤔 曖昧, 💡 思い出した, ✨ 完璧)
- **Master/Unmaster**: Mark items as "mastered" to exclude from review cycle, or unmaster to resume reviews
- **Smart Filtering**: Default view shows only items needing review; toggle to show all items
- **Text Search**: Keyword filter to narrow down the item list; case-insensitive, applied after status filter
- **Smart Sorting**: Items sorted by next_review date (ascending) for optimal study order
- **Review-First UI**: Collapsible add form prioritizes daily review workflow
- **Markdown Viewer**: Item content rendered as Markdown (bold, code, lists, blockquotes, etc.) using react-markdown
- **Markdown Preview**: Edit form includes Edit/Preview tab toggle for live markdown preview before saving
- **Dropdown Actions**: Integrated edit/delete menu with hover effects and click-outside-to-close

### Frontend Architecture (`frontend/src/`)

- **`App.tsx`**: Orchestrator — state management (items, error, editing, copy, modal, dropdown) and CRUD handlers
- **`api.ts`**: Hono API サーバーをラップする API レイヤー。`getImageUrl()` ヘルパーと ApiError クラス
- **`types.ts`**: TypeScript interfaces for Item (id: string), CreateItemData, UpdateItemData, and API responses
- **`constants.ts`**: Shared configuration for image validation and error messages
- **`shared.css`**: Shared styles used by multiple components (input-wrapper/char-counter, image upload, Markdown rendering)
- **`App.css`**: App-level styles only (.app, header, .error)
- **`index.css`**: Global styles (body, *, #root) + CSS カスタムプロパティ（デザイントークン）定義

**Custom Hooks (`frontend/src/hooks/`)**:
- **`useImageUpload.ts`**: Image state, file validation, change/paste handlers, preview URL cleanup on unmount
- **`useImageModal.ts`**: Modal open/close state and ESC key listener
- **`useDropdown.ts`**: Dropdown open state (string | null) and click-outside listener

**Components (`frontend/src/components/`)**:
- **`AddItemForm/`**: Collapsible form with image upload; manages its own content/image state
- **`EditForm/`**: Edit textarea with Edit/Preview tab toggle (Markdown preview); manages its own state
- **`ItemDisplay/`**: Read-only card view with Markdown rendering (react-markdown), copy button, dropdown menu
- **`ItemCard/`**: Card wrapper rendering either EditForm or ItemDisplay + action buttons (review/master)
- **`ItemList/`**: Items header, search bar, filtering/sorting logic, maps items to ItemCards
- **`ImageModal/`**: Full-screen image overlay modal

**UI Features**:
  - Character counters with visual warnings (900+ orange, 1000+ red, submit disabled when over 1000)
  - Markdown rendering for item content (bold, italic, code, lists, blockquotes, headings)
  - Edit/Preview tab toggle in edit form for live Markdown preview
  - Image upload with preview thumbnails and validation
  - Collapsible add form for review-first workflow
  - Dropdown menus with outside-click handling
  - Keyword search box with clear button (status filter → text search applied in sequence)

**Design System（`index.css` `:root` で定義）**:
  - CSS カスタムプロパティでデザイントークンを一元管理（色、radius、shadow、ボタンサイズ、transition）
  - 色: `--color-primary`, `--color-text`, `--color-bg`, `--color-border`, `--color-success/warning/danger/master` 系
  - Border radius: `--radius-sm: 6px`（小要素）, `--radius-md: 12px`（カード・フォーム）
  - ボタン: `--btn-height: 40px`, `--btn-height-sm: 32px`, `--btn-font-size: 0.875rem`
  - Transition: `--transition-duration: 150ms`, `--transition-easing: ease-out`（`transition: all` は使用禁止）
  - ボタンの `:active` 状態に `transform: scale(0.96)` の tactile feedback
  - 画像に `outline: 1px solid rgba(0,0,0,0.1)` の subtle outline
  - メタ情報の数値に `font-variant-numeric: tabular-nums`

### API Server Architecture (`server/`)

- **`src/index.ts`**: Hono アプリのエントリーポイント。ルーティング・静的ファイル配信・SPA フォールバック・エラーハンドリング・Node.js サーバー起動
- **`src/sm2.ts`**: SM-2 スペースドリピティションアルゴリズム（`calculateNextReview`, `getInitialSM2Values`）
- **`src/obsidian/parser.ts`**: `.md` ファイル ↔ `ObsidianItem` 変換（Frontmatter パーサー）
- **`src/obsidian/client.ts`**: Obsidian Local REST API との全 CRUD 操作（listItems, createItem, updateItem, deleteItem, reviewItem, masterItem, unmasterItem, uploadImage, getImageBuffer）
- **`src/routes/items.ts`**: アイテム CRUD ルート（Hono サブアプリ）
- **`src/routes/images.ts`**: 画像プロキシルート（Obsidian から Bearer 認証付きで取得し返す）

**API エンドポイント**:

| メソッド | パス | ステータス | 機能 |
|---------|------|--------|------|
| GET | /api/items | 200 | アイテム一覧取得 |
| POST | /api/items | 201 + Location | アイテム作成（multipart/JSON 対応）|
| PUT | /api/items/:id | 200 | アイテム更新（multipart/JSON 対応）|
| DELETE | /api/items/:id | 204 | アイテム削除 |
| PUT | /api/items/:id/review | 200 | レビュー（SM-2 計算）|
| PUT | /api/items/:id/master | 200 | マスター済みにする |
| PUT | /api/items/:id/unmaster | 200 | マスター解除 |
| GET | /api/images/:filename | 200 | 画像取得（Obsidian から proxy）|

**レスポンス形式**:
```typescript
// 成功（単一リソース）: { item: Item }
// 成功（一覧）:         { items: Item[] }
// エラー:               { error: { code: string, message: string } }
```

**認証・設定**:
- Obsidian API キーは `server/.env` に `OBSIDIAN_API_KEY` として保存
- クライアントからの認証不要（localhost のみバインド）
- `server/.env.example` にテンプレートあり

### Obsidian Integration Architecture

```
[ブラウザ: React App]          ─┐
[MCP サーバー (Claude Desktop)] ─┤→ [Hono API Server :3001] → [Obsidian Local REST API :27123] → [Vault *.md]
                                                                                                       ↕ R2バックアッププラグイン
                                                                                              [Cloudflare R2]
                                                                                                       ↕ R2バックアッププラグイン
                                                                                              [Android Obsidian]
```

**Vault 同期（Mac mini ↔ Android）**:
- Mac mini と Android の Obsidian は、それぞれ Obsidian コミュニティプラグイン（R2 バックアップ）を使って Cloudflare R2 の同じバケットに同期
- 同期対象は `.md` ファイルと `attachments/` フォルダの両方

**Obsidian Local REST API エンドポイント（server 側が使用）**:
- `GET /vault/repeatnote/` — ファイル一覧取得
- `GET /vault/repeatnote/{id}.md` — 単一ファイル取得
- `PUT /vault/repeatnote/{id}.md` — ファイル作成・更新
- `DELETE /vault/repeatnote/{id}.md` — ファイル削除
- `PUT /vault/repeatnote/attachments/{filename}` — 画像アップロード
- `DELETE /vault/repeatnote/attachments/{filename}` — 画像削除

### Data Storage Format

各アイテムは `{UUID}.md` ファイルとして vault に保存される。

```markdown
---
aliases:
  - "アイテムの本文テキスト（"
created_at: 2026-01-01T00:00:00.000Z
interval_days: 7
ease_factor: 2.5
review_count: 3
next_review: 2026-05-16
mastered: false
---

アイテムの本文テキスト（Markdown対応）

![[abc123.jpg]]
```

- `id` はファイル名（UUID 文字列）から取得
- `aliases` はコンテンツ先頭15文字（改行→スペース、`"` と `\` をエスケープ）。Obsidian 検索・クイックスイッチャーで表示される
- 画像がある場合は本文末尾に `![[filename]]` 形式で記述。Obsidian で直接画像を表示できる
- 画像がない場合は `![[...]]` なし
- `next_review` は `YYYY-MM-DD` 形式

### Claude Desktop MCP Integration (`mcp/`)

Claude Desktop から `add_item` ツールで直接アイテムを追加できる MCP サーバー。

- **実装**: `mcp/src/index.ts`（`@modelcontextprotocol/sdk` 使用）
- **API**: `http://localhost:3001/api/items`（Hono API サーバー経由）
- **認証**: 不要（localhost のみ）
- **ビルド**: `cd mcp && npm run build`
- **登録**: `~/Library/Application Support/Claude/claude_desktop_config.json` に `repeatnote` サーバーとして登録済み

### Architecture Diagram

システム全体のアーキテクチャ図は `architecture.drawio` に保存されている。構成に変更があった場合はこのファイルも更新すること。

### Key Integration Points

- **API Communication**: `frontend/src/api.ts` → `/api`（相対 URL。本番は同一オリジン、dev は Vite proxy 経由）
- **Data Storage**: Obsidian vault の `.md` ファイル（Frontmatterに SM-2 メタデータ）
- **Image Storage**: vault の `attachments/` フォルダ（Obsidian で直接参照可能）
- **Image URL**: フロントエンドは `getImageUrl(filename)` → `/api/images/{filename}`（相対 URL）を使用
- **SM-2 Algorithm**: サーバー側 `server/src/sm2.ts` で計算
- **Item ID**: UUID 文字列（`crypto.randomUUID()`）
- **Build Process**: Vite のみでフロントエンドをビルド（Wrangler 不要）

## Local Development Setup

### 前提条件

1. Obsidian に「Local REST API」プラグインをインストール・有効化
2. Obsidian を起動した状態にする
3. `server/.env` を作成（`.env.example` を参考）:
   ```
   OBSIDIAN_API_KEY=<Obsidian Local REST API プラグインの API キー>
   ```
4. API サーバーを起動: `cd server && npm start`
5. ブラウザで `http://localhost:3001` にアクセス（フロントエンドも Hono が配信）

開発時は `cd frontend && npm run dev`（port 5173）で Vite HMR を使うことも可能。

### ローカルホスティング（自動起動）

Mac ログイン時に Hono サーバー（port 3001）を自動起動する launchd サービスを設定済み。フロントエンドの静的ファイルも Hono が配信するため、サービスは 1 つのみ。

**plist**: `~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist`（port 3001）

**手動操作コマンド**:
```bash
# サービス開始
launchctl load ~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist

# サービス停止
launchctl unload ~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist

# ログ確認
tail -f ~/Library/Logs/repeatnote-api.log
```

**コード変更後の手順**:
```bash
cd frontend && npm run build
launchctl unload ~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist
launchctl load ~/Library/LaunchAgents/com.ifukazoo.repeatnote-api.plist
```

**Obsidian Local REST API の CORS**: プラグインは `Access-Control-Allow-Origin: *` を返すが、フロントエンドから直接アクセスは不要（Hono サーバー経由）。

### 注意事項

- Obsidian が起動していないと RepeatNote は動作しない
- Hono サーバー（port 3001）が起動していないとフロントエンドは動作しない
- `cd frontend && npm run dev`（port 5173）は開発時のみ。本番アクセスは `http://localhost:3001`

## Code Formatting Standards

This project uses Prettier for consistent code formatting. All code output should follow the configuration in `.prettierrc`:

```json
{
  "semi": true,
  "tabWidth": 2,
  "singleQuote": true
}
```

**Key formatting rules:**
- **Semicolons**: Required at the end of statements
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings

## Testing Framework

**RepeatNote** uses a comprehensive unit testing suite built with modern JavaScript testing tools:

### Test Stack
- **Vitest**: Fast unit test runner with Vite integration
- **React Testing Library**: User-centric component testing
- **jsdom**: Browser environment simulation
- **@testing-library/user-event**: User interaction simulation

### Test Structure

**サーバー側 (`server/src/test/`)**:
- **`sm2.test.ts`**: SM-2 スペースドリピティションアルゴリズムテスト (11 tests)
  - 間隔計算、ease factor 更新・境界値、初期値
- **`parser.test.ts`**: Obsidian Frontmatter パーサーテスト (17 tests)
  - .md ↔ ObsidianItem 変換、本文末尾画像リンクの抽出、null フィールド処理、ラウンドトリップ
- **`items.test.ts`**: アイテム CRUD ルートテスト (15 tests)
  - 全エンドポイント（一覧・作成・更新・削除・review・master・unmaster）
  - バリデーション、404・500 エラーハンドリング
- **`images.test.ts`**: 画像プロキシルートテスト (3 tests)
  - 画像取得、not_found エラー、internal_error

**フロントエンド側 (`frontend/src/test/`)**:
- **`sm2-algorithm.test.ts`**: SM-2 アルゴリズムテスト (12 tests)
- **`api.test.ts`**: API クライアント関数テスト (13 tests)
  - 全 CRUD 操作、Hono サーバーへのリクエスト検証
  - エラーハンドリング（新レスポンス形式対応）
- **`constants.test.ts`**: 設定・バリデーションテスト (10 tests)
- **`sorting.test.ts`**: アイテムソート・フィルタリングテスト (6 tests)
- **`app.test.tsx`**: React コンポーネント統合テスト (11 tests)

### Test Commands
- `cd frontend && npm test` - Watch mode for development
- `cd frontend && npm run test:run` - Single run for CI/automation（フロントエンドテスト）
- `cd frontend && npm run test:ui` - Interactive UI mode
- `cd server && npm run test:run` - サーバー側テストのみ
- `cd frontend && npx vitest run src/test/<filename>.test.ts` - 単一テストファイルを実行

**Total: 98 tests** covering SM-2 algorithm, Obsidian parser, API routes, API client layer, validation, and UI components.

### テスト環境の方針

テスト環境は jsdom（ブラウザシミュレーション）とNode.js の 2 環境を使い分け。
- フロントエンドテスト: jsdom（`frontend/vitest.config.ts`）
- サーバーテスト: Node.js（`server/vitest.config.ts`）

Obsidian クライアント（`server/src/obsidian/client.ts`）は `vi.mock` でモックし、実際の HTTP 通信は行わない。

**Obsidian REST API の実動作確認方法**: Obsidian と API サーバーを起動した状態で `cd frontend && npm run dev` を実行し、ブラウザで手動確認する。

## Development Notes

- **Comprehensive test coverage**: All critical functionality is covered by automated tests, ensuring code quality and preventing regressions.
- **Test-driven development**: ビジネスロジック（SM-2アルゴリズム、Obsidianパーサー、API ルートなど）はTDDで開発する（テストを先に書いてから実装）。UIコンポーネントはモノリシックな `App.tsx` の制約上テストファーストが難しいため、実装後にテストを追加する。変更後は `cd frontend && npm test` でテストを確認し、`cd frontend && npm run dev` で手動UIテストをする。
- **Documentation update**: After adding or changing features, always update CLAUDE.md to reflect the changes (Core Functionality, Frontend Architecture, Current Status, test counts, etc.).
- **Frontend sorting optimization**: Items are sorted by next_review date (ascending) on the frontend for optimal performance and user experience.
- **Item ID**: UUID 文字列（`crypto.randomUUID()`）
- **Server dependency**: API サーバー（port 3001）が起動していないとフロントエンドは動作しない。開発時は必ず先に `cd server && npm start` を実行すること。
