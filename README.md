# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

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
