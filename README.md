# RepeatNote

**効率的な記憶定着を支援するスペースドリピティション学習アプリ**

RepeatNoteは、SM-2アルゴリズムを実装した間隔反復学習システムです。学習効果を最大化するために、記憶の定着度に基づいて最適な復習タイミングを自動計算します。

## 主な機能

- **スペースドリピティション**: SM-2アルゴリズムによる科学的な復習間隔計算
- **学習項目管理**: 750文字以内の学習項目を作成・編集・削除
- **品質評価システム**: 0-5段階の記憶品質評価（😵 忘れた、🤔 曖昧、💡 思い出した、✨ 完璧）
- **スマートフィルタリング**: 復習が必要な項目のみを表示する集中学習モード
- **インライン編集**: 項目内容をその場で素早く編集

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Cloudflare Workers + D1 Database
- **デプロイ**: Cloudflare Pages + Workers

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# ローカルD1データベースの初期化
npx wrangler d1 execute repeatnote-db --local --file=schema.sql

# 開発サーバーの起動
npm run dev
```

## 利用可能なコマンド

- `npm run dev` - 開発サーバー起動（Vite HMR有効）
- `npm run build` - プロダクションビルド
- `npm run lint` - ESLintによるコード品質チェック
- `npm run preview` - ビルド結果のプレビュー
- `npm run deploy` - Cloudflare Workersへのデプロイ

## 備忘録

### Cloudflare Workers設定について

#### wrangler.jsonc - SPAルーティング設定
```jsonc
"assets": {
    "not_found_handling": "single-page-application"
}
```

**この設定の意味:**
- 静的ファイルが見つからない場合（404エラー）に、`index.html`を返す
- React等のSPAでクライアントサイドルーティングを使用する際に必要
- `/api/`で始まるパス → Workerが処理
- その他のパス → React SPAの`index.html`を返してクライアントサイドでルーティング

**動作例:**
1. ユーザーが`/about`にアクセス
2. 実際のファイルは存在しないが、この設定により`index.html`を返す
3. Reactアプリがロードされてクライアントサイドでルーティング処理

### プロジェクト構造

#### ルートディレクトリのファイル

**設定ファイル**
- `package.json` - プロジェクトの依存関係とスクリプト定義
- `vite.config.ts` - Vite（ビルドツール）の設定
- `eslint.config.js` - ESLintのコード品質チェック設定
- `wrangler.jsonc` - Cloudflare Workersのデプロイ設定
- `tsconfig.*.json` - TypeScript設定（用途別に分割）
- `worker-configuration.d.ts` - Cloudflare Workers用の型定義

**プロジェクトファイル**
- `index.html` - SPAのエントリポイント
- `CLAUDE.md` - Claude Code用の開発ガイド

#### ディレクトリ構成

**`src/` - Reactアプリケーション**
- `main.tsx` - React アプリのエントリポイント
- `App.tsx` - メインコンポーネント
- `assets/` - 画像ファイル（ロゴなど）

**`worker/` - Cloudflare Worker**
- `index.ts` - API処理を行うWorkerコード

**`dist/` - ビルド成果物**
- `client/` - Reactアプリのビルド結果
- `repeatnote/` - Cloudflare Worker用のビルド結果

**その他**
- `public/` - 静的ファイル
- `.vscode/` - VS Code設定
- `.wrangler/` - Wranglerの作業ディレクトリ

### ローカル開発環境の設定

#### D1データベースローカル開発設定

**wrangler.jsonc - preview_database_id設定**
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "repeatnote-db",
    "database_id": "placeholder-id-will-be-replaced-after-creation",
    "preview_database_id": "local-repeatnote-db"
  }
]
```

**この設定の意味:**
- `database_id`: プロダクション用データベースID（実際のCloudflare D1作成後に設定）
- `preview_database_id`: ローカル開発用の識別子
- ローカルD1は `.wrangler/state/v3/d1` に SQLite ファイルとして保存

#### ローカル開発手順
1. **スキーマ適用**: `npx wrangler d1 execute repeatnote-db --local --file=schema.sql`
2. **開発サーバー起動**: `npm run dev`
3. **型定義生成**: `npm run cf-typegen` (D1設定変更後)

#### ローカルD1データベース操作
```bash
# スキーマ適用
npx wrangler d1 execute repeatnote-db --local --file=schema.sql

# 直接SQLコマンド実行
npx wrangler d1 execute repeatnote-db --local --command="SELECT * FROM items"

# データベースリセット（開発時）
rm -rf .wrangler/state/v3/d1
npx wrangler d1 execute repeatnote-db --local --file=schema.sql
```
