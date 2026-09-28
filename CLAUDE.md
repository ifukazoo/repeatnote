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

### E2E テスト（`e2e/` ディレクトリ）

- `cd e2e && npm test` - Playwright E2E テストを実行（モック Obsidian API サーバーを自動起動）
- `cd e2e && npm run test:ui` - Playwright UI モードでテスト実行

## Application Architecture

**RepeatNote** is a spaced repetition learning application implementing the SM-2 algorithm for optimal memory retention. Built with React + TypeScript + Vite frontend and a local Hono API server, using Obsidian Local REST API as the backend storage layer.

### Core Functionality

- **Spaced Repetition**: SM-2 algorithm calculates optimal review intervals based on recall quality (0-5 scale)
- **Learning Items**: Create, edit, and delete study items with 1000-character limit
- **Image Support**: Upload, edit, and delete images (JPEG/PNG/WebP/GIF, 5MB limit) stored in Obsidian vault `attachments/`
- **HTML Artifact**: 外部の `.html` / `.htm` ファイル（Claude.ai の artifact など、5MB まで）を1アイテムに1つ添付できる（画像と併用可）。カードの「🧩 artifact を開く」から、ほぼ全画面のモーダル内の sandbox iframe で JS 込みで表示する（`allow-same-origin` なし。ノートのデータには触れられない）。外部 CDN の読み込みは可。artifact 内の localStorage は使えない。検索対象は本文のみ
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
- **`api.ts`**: Hono API サーバーをラップする API レイヤー。`getAttachmentUrl()` ヘルパーと ApiError クラス。添付の変更が1件でもあれば multipart で送る
- **`types.ts`**: Item（`attachments: { image?, html? }`）、AttachmentKind / AttachmentChanges、CreateItemData、UpdateItemData、API レスポンス型
- **`constants.ts`**: 添付種別の設定 `ATTACHMENT_KINDS`（拡張子・accept・上限・プレビュー・貼り付け・エラーメッセージ）、`ATTACHMENT_KIND_ORDER`、`validateAttachmentFile()`（拡張子で判定）、artifact の iframe 用 `ARTIFACT_SANDBOX`
- **`shared.css`**: Shared styles used by multiple components (input-wrapper/char-counter, image upload, Markdown rendering)
- **`App.css`**: App-level styles only (.app, header, .error)
- **`index.css`**: Global styles (body, *, #root) + CSS カスタムプロパティ（デザイントークン）定義

**Custom Hooks (`frontend/src/hooks/`)**:
- **`useAttachmentsEditor.ts`**: 全添付種別の選択・取り消し・削除指示をまとめて管理（検証、プレビュー URL の作成と解放、貼り付けの種別振り分け、`files()` / `changes()` で送信用に変換）
- **`useImageModal.ts`**: Modal open/close state and ESC key listener
- **`useDropdown.ts`**: Dropdown open state (string | null) and click-outside listener

**Components (`frontend/src/components/`)**:
- **`AddItemForm/`**: Collapsible form with attachments (image / HTML); manages its own content/attachment state
- **`EditForm/`**: Edit textarea with Edit/Preview tab toggle (Markdown preview) + 添付の差し替え・削除; manages its own state
- **`AttachmentField/`**: 添付1種別分の入力欄（現在の添付・削除と取り消し・ファイル選択）。フォームは `ATTACHMENT_KIND_ORDER` で回して並べる。種別ごとの文言と現在の添付の表示は `ATTACHMENT_UI` に定義
- **`ItemDisplay/`**: Read-only card view with Markdown rendering (react-markdown), copy button, dropdown menu, 「🧩 artifact を開く」ボタン
- **`ItemCard/`**: Card wrapper rendering either EditForm or ItemDisplay + action buttons (review/master)
- **`ItemList/`**: Items header, search bar, filtering/sorting logic, maps items to ItemCards
- **`ImageModal/`**: Full-screen image overlay modal
- **`ArtifactModal/`**: artifact（HTML）をほぼ全画面の sandbox iframe で表示。ヘッダーに `<title>`（別途 fetch して DOMParser で取得、閉じたら中断）と ×。ESC は枠外にフォーカスがあるときだけ効く。背景クリックでは閉じない

**UI Features**:
  - Character counters with visual warnings (900+ orange, 1000+ red, submit disabled when over 1000)
  - Markdown rendering for item content (bold, italic, code, lists, blockquotes, headings)
  - Edit/Preview tab toggle in edit form for live Markdown preview
  - Image upload with preview thumbnails and validation
  - HTML artifact の添付（ファイル選択のみ）と、モーダルでの表示（一覧では iframe を起動しない）
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

- **`src/index.ts`**: Hono アプリのエントリーポイント。ルーティング・静的ファイル配信・SPA フォールバック・エラーハンドリング・Node.js サーバー起動（`127.0.0.1` のみで待ち受け）
- **`src/attachments.ts`**: 添付種別レジストリ `ATTACHMENT_KINDS`（拡張子 → Content-Type の許可リスト、保存時の拡張子、上限、配信時のヘッダー）。種別の判別・アップロードの検証・保存名（`{uuid}.{小文字の拡張子}`）・配信ヘッダーはすべてここを参照する。**新しい添付種別はここにエントリを足すのが起点**（フロントの `constants.ts` も同期。一致はテストで確認）
- **`src/middleware/origin.ts`**: `rejectForeignHost`（Host が localhost / 127.0.0.1 / [::1] 以外なら 403。DNS リバインディング対策）と `rejectCrossOriginWrites`（GET/HEAD/OPTIONS 以外で Origin が自オリジン以外なら 403。sandbox iframe の `Origin: null` も拒否。Origin を送らない MCP・curl は通す）
- **`src/sm2.ts`**: SM-2 スペースドリピティションアルゴリズム（`calculateNextReview`, `getInitialSM2Values`）
- **`src/obsidian/parser.ts`**: `.md` ファイル ↔ `ObsidianItem` 変換（Frontmatter パーサー、本文末尾の添付の抽出）
- **`src/obsidian/client.ts`**: Obsidian Local REST API との全 CRUD 操作（listItems, createItem, updateItem, deleteItem, reviewItem, masterItem, unmasterItem, getAttachment）。添付の変更は「新ファイル PUT → md PUT → 旧ファイル削除」の順で行い、失敗したら新ファイルを削除する
- **`src/routes/items.ts`**: アイテム CRUD ルート（Hono サブアプリ）。添付のフィールド名は種別名（`image` / `html`）、削除は `removeImage` / `removeHtml`。検証は client 呼び出しの前に済ませる
- **`src/routes/attachments.ts`**: 添付の配信ルート。許可リストにあるファイル名のみ Obsidian から取得し、Content-Type は拡張子から決めて `nosniff` を付ける。html には `Content-Security-Policy: sandbox ...` を付ける

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
| GET | /api/attachments/:filename | 200 | 添付（画像・HTML）の取得（Obsidian から proxy。不正なファイル名は 400）|
| GET | /api/images/:filename | 200 | `/api/attachments` の互換エイリアス |

**レスポンス形式**:
```typescript
// 成功（単一リソース）: { item: Item }
// 成功（一覧）:         { items: Item[] }
// エラー:               { error: { code: string, message: string } }
```

**認証・設定**:
- Obsidian API キーは `server/.env` に `OBSIDIAN_API_KEY` として保存
- クライアントからの認証不要（`127.0.0.1` のみバインド）。代わりに Host と Origin を検証する（`src/middleware/origin.ts`）
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
- `GET /vault/repeatnote/attachments/{filename}` — 添付（画像・HTML）取得
- `PUT /vault/repeatnote/attachments/{filename}` — 添付アップロード
- `DELETE /vault/repeatnote/attachments/{filename}` — 添付削除

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
![[def456.html]]
```

- `id` はファイル名（UUID 文字列）から取得
- `aliases` はコンテンツ先頭15文字（改行→スペース、`"` と `\` をエスケープ）。Obsidian 検索・クイックスイッチャーで表示される
- 添付は本文末尾に `![[filename]]` 形式で、レジストリの順（画像 → html）に1行ずつ記述する。frontmatter には持たない。Obsidian で画像は直接表示できる（HTML は表示できない）
- 読み込み時は本文末尾に連続する `![[...]]` 行（間の空行は可）を拡張子で種別に振り分け、各種別の**最後の1つ**を添付とする。種別に該当しない拡張子、パスを含む名前、同じ種別の他の埋め込みは本文に残す
- 添付がない場合は `![[...]]` なし
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
- **Attachment Storage**: vault の `attachments/` フォルダ（画像は Obsidian で直接参照可能）
- **Attachment URL**: フロントエンドは `getAttachmentUrl(filename)` → `/api/attachments/{filename}`（相対 URL）を使用
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
- **`parser.test.ts`**: Obsidian Frontmatter パーサーテスト (29 tests)
  - .md ↔ ObsidianItem 変換、本文末尾の添付（画像・html）の抽出、未知の埋め込み・パスを含む名前を本文に残すこと、CRLF、null フィールド処理、ラウンドトリップ
- **`client.test.ts`**: Obsidian クライアントテスト (17 tests、fetch をメモリ上の vault で置き換え)
  - `listItems` の同時接続数制限（最大 8 並列。数百並列だと Obsidian が ECONNRESET を返すため）
  - 保存名の正規化、差し替えの順序と失敗時のロールバック、削除と差し替えの優先順位、attachments 外のファイルを消さないこと、review/master 後も添付が残ること
- **`items.test.ts`**: アイテム CRUD ルートテスト (31 tests)
  - 全エンドポイント（一覧・作成・更新・削除・review・master・unmaster）
  - 添付の受け渡し（multipart / JSON）、種別・拡張子・サイズの検証、404・500 エラーハンドリング
- **`attachments.test.ts`**: 添付の配信ルートテスト (11 tests)
  - 拡張子からの Content-Type、nosniff、html の CSP sandbox、不正なファイル名の 400、`/api/images` エイリアス
- **`origin.test.ts`**: Host / Origin 検証ミドルウェアテスト (12 tests)

**フロントエンド側 (`frontend/src/test/`)**:
- **`sm2-algorithm.test.ts`**: SM-2 アルゴリズムテスト (12 tests)
- **`api.test.ts`**: API クライアント関数テスト (17 tests)
  - 全 CRUD 操作、Hono サーバーへのリクエスト検証、添付の multipart 送信
  - エラーハンドリング（新レスポンス形式対応）
- **`constants.test.ts`**: 添付種別の設定・バリデーションテスト (10 tests)
- **`attachment-kinds-sync.test.ts`**: 添付種別の定義（種別・拡張子・上限・sandbox）がサーバーと一致しているかのテスト (4 tests)
- **`useAttachmentsEditor.test.ts`**: 添付編集フックのテスト (10 tests)
- **`artifact.test.tsx`**: ArtifactModal・artifact ボタン・EditForm の添付操作のテスト (17 tests)
- **`sorting.test.ts`**: アイテムソート・フィルタリングテスト (6 tests)
- **`app.test.tsx`**: React コンポーネント統合テスト (11 tests)

### Test Commands
- `cd frontend && npm test` - Watch mode for development
- `cd frontend && npm run test:run` - Single run for CI/automation（フロントエンドテスト）
- `cd frontend && npm run test:ui` - Interactive UI mode
- `cd server && npm run test:run` - サーバー側テストのみ
- `cd e2e && npm test` - Playwright E2E テスト実行
- `cd frontend && npx vitest run src/test/<filename>.test.ts` - 単一テストファイルを実行

**Total: 198 unit tests（server 111 + frontend 87）+ 5 E2E tests** covering SM-2 algorithm, Obsidian parser, attachments, API routes, API client layer, validation, UI components, and end-to-end user flows（artifact の JS から API に書き込めないことの確認を含む）.

### テスト環境の方針

テスト環境は jsdom（ブラウザシミュレーション）、Node.js、Playwright の 3 環境を使い分け。
- フロントエンドテスト: jsdom（`frontend/vitest.config.ts`）
- サーバーテスト: Node.js（`server/vitest.config.ts`）
- E2E テスト: Playwright + モック Obsidian API サーバー（`e2e/`）

Obsidian クライアント（`server/src/obsidian/client.ts`）はユニットテストでは `vi.mock` でモック。E2E テストでは `OBSIDIAN_BASE_URL` をモックサーバーに向けて実際の HTTP 通信を行う。

**Obsidian REST API の実動作確認方法**: Obsidian と API サーバーを起動した状態で `cd frontend && npm run dev` を実行し、ブラウザで手動確認する。

## Development Notes

- **Comprehensive test coverage**: All critical functionality is covered by automated tests, ensuring code quality and preventing regressions.
- **Test-driven development**: ビジネスロジック（SM-2アルゴリズム、Obsidianパーサー、API ルートなど）はTDDで開発する（テストを先に書いてから実装）。UIコンポーネントはモノリシックな `App.tsx` の制約上テストファーストが難しいため、実装後にテストを追加する。変更後は `cd frontend && npm test` でテストを確認し、`cd frontend && npm run dev` で手動UIテストをする。
- **Documentation update**: After adding or changing features, always update CLAUDE.md to reflect the changes (Core Functionality, Frontend Architecture, Current Status, test counts, etc.).
- **Frontend sorting optimization**: Items are sorted by next_review date (ascending) on the frontend for optimal performance and user experience.
- **Item ID**: UUID 文字列（`crypto.randomUUID()`）
- **Server dependency**: API サーバー（port 3001）が起動していないとフロントエンドは動作しない。開発時は必ず先に `cd server && npm start` を実行すること。
