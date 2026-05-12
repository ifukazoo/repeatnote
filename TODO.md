# RepeatNote TODO

## 残りタスク

### 1. プロダクション環境の最適化

**ステータス**: pending
**優先度**: 中

**内容**:

- セキュリティヘッダーの追加（X-Content-Type-Options 等）
- レート制限の実装検討

### 2. プロジェクトルートの整理

**ステータス**: pending
**優先度**: 低

**内容**:

- フロントエンドファイル（`src/`, `package.json`, `vite.config.ts` 等）を `frontend/` フォルダに移動
- プロジェクトルートに `frontend/`, `server/`, `mcp/`, `scripts/`, `plans/` が並ぶ構成にする

## 完了済み機能

### 基本機能

✅ Cloudflare D1データベースの設定とスキーマ作成
✅ Worker側のAPI基盤実装（ルーティング）
✅ D1データベース操作関数の実装
✅ API エンドポイントの実装
✅ バックエンドAPIのテスト実行
✅ React フロントエンドの実装
✅ SM-2アルゴリズムの実装

### 学習項目管理機能

✅ 学習項目編集機能のバックエンドAPI実装
✅ 学習項目編集機能のフロントエンドUI実装
✅ 文字数制限を750文字に変更
✅ 文字数カウンターUIの実装
✅ 入力欄の複数行対応（textarea実装、改行表示対応）
✅ 削除ボタンの表示改善（ドロップダウンメニュー統合、誤削除防止）

### 画像機能（完全実装済み）

✅ Cloudflare R2バケットの設定と統合
✅ 画像アップロード用APIエンドポイント作成
✅ データベーススキーマ拡張（image_url, image_filename フィールド追加）
✅ R2への画像保存・取得・削除機能実装
✅ ファイル選択・プレビューUIコンポーネント作成
✅ 画像表示機能の実装（学習項目カード内）
✅ 画像編集機能の実装（追加・変更・削除）
✅ 画像サイズ制限とバリデーション実装（5MB制限、JPEG/PNG/WebP/GIF対応）
✅ セキュリティ強化（MIMEタイプベース拡張子決定、crypto.randomUUID使用）
✅ DRY原則適用（共通バリデーション関数、定数化）
✅ サムネイルプレビュー機能（ファイル選択時）

### UX改善

✅ 折りたたみ式新規追加フォーム（復習優先UI）
✅ フォーム要素のレイアウト修正（幅縮小問題、ボタン高さ統一）
✅ アプリケーションのセンタリングとスタイル統一
✅ 復習項目表示エリアの拡大（ヘッダー・ボタンサイズ最適化）
✅ Markdownレンダリング（react-markdown + remark-gfm）
✅ 編集フォームのMarkdownプレビュータブ
✅ テキスト検索フィルター（キーワード絞り込み）

### アーキテクチャ改善

✅ Cloudflare Worker → Obsidian Local REST API へのストレージ移行
✅ ローカル Hono API サーバー導入（server/ ディレクトリ）
  - SM-2アルゴリズムをフロントエンドからサーバーへ移動
  - Obsidianクライアントをフロントエンドからサーバーへ移動
  - フロントエンド・MCPの共通バックエンドとして機能
✅ コンポーネント分割（ItemCard, AddItemForm, EditForm, ItemDisplay, ItemList, ImageModal）
✅ カスタムフック抽出（useImageUpload, useImageModal, useDropdown, useObsidianImage）
✅ Obsidian vault の markdown ファイルへのデータ移行スクリプト

### 開発環境・品質

✅ CORS設定の最適化
✅ Prettierによるコードフォーマット統一
✅ ESLint設定とコード品質向上
✅ 型安全性強化（FormData型ガード、AllowedImageType定義）
✅ launchd サービスによる自動起動（Hono サーバー 1 つに統合）

### テスト機能（完全実装済み）

✅ Vitest + React Testing Libraryテスト環境構築
✅ SM-2アルゴリズムの包括的テスト（12テスト）
✅ Obsidian Frontmatterパーサーテスト（11テスト）
✅ API関数の全CRUD操作テスト（13テスト）
✅ 画像バリデーション・定数テスト（10テスト）
✅ Reactコンポーネント基本機能テスト（11テスト）
✅ ソート・フィルターロジックテスト（6テスト）
✅ useObsidianImageフックテスト（6テスト）
✅ サーバーサイドテスト（items: 15テスト、images: 3テスト）
✅ テストコマンドの追加（watch, run, ui モード）
✅ 合計109テスト、100%成功でコード品質保証

---

**最終更新**: 2026-05-12
**現在の状態**: Hono サーバー（port 3001）でフロントエンド + API を一本化、包括的テストスイート完備（109テスト）、プロダクション運用可能
