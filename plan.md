# RepeatNote Viewer (PWA) 実装計画

## 目的

Android 端末から RepeatNote のアイテムを閲覧専用で参照できる PWA を作成する。
Mac mini や Hono API サーバーへの依存なし。端末ローカルの Obsidian Vault を直接読む。

## アーキテクチャ

```
[Cloudflare Pages] → PWA をホスティング
        ↓ ブラウザでアクセス
[Android Chrome]
  PWA (RepeatNote Viewer)
        ↓ File System Access API（showDirectoryPicker）
[Android ストレージ: /storage/emulated/0/Documents/AndroidVault]
  Obsidian Vault clone（*.md + attachments/）
        ↑ R2 バックアッププラグインで同期
[Cloudflare R2]
        ↑ R2 バックアッププラグインで同期
[Mac mini: Obsidian Vault]
```

## ディレクトリ構成

```
viewer/
  public/
    icons/            PWA アイコン（192x192, 512x512）
  src/
    main.tsx
    App.tsx
    App.css
    types.ts          Item 型定義（frontend/src/types.ts から流用）
    parser.ts         .md パーサー（server/src/obsidian/parser.ts を移植）
    utils/
      filter.ts       フィルタリング・ソートロジック
    components/
      VaultPicker.tsx   フォルダ選択 UI（File System Access API）
      ItemList.tsx      一覧・フィルター・検索
      ItemCard.tsx      アイテム表示（Markdown + 画像）
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
```

## 技術スタック

- React 19 + TypeScript
- Vite + vite-plugin-pwa
- react-markdown + remark-gfm（Markdown レンダリング）
- File System Access API（ブラウザ標準 API）

## 機能仕様

| 機能 | 詳細 |
|------|------|
| フォルダ選択 | `showDirectoryPicker()` で Vault フォルダを選択。毎回選択が必要 |
| アイテム一覧 | next_review 昇順でソート |
| デフォルト表示 | `next_review <= 今日 かつ mastered === false` のアイテムのみ |
| ステータスフィルター | 復習が必要なもの / 全件 / マスター済み |
| テキスト検索 | content の case-insensitive キーワード検索 |
| Markdown レンダリング | react-markdown で本文表示 |
| 画像表示 | attachments/ から FileSystemFileHandle で読み取り ObjectURL を生成 |

## 実装ステップ

### Step 1: プロジェクト初期化
> スキル: `/vite-patterns`（Vite config・vite-plugin-pwa 設定の参考に）
- [ ] `viewer/` ディレクトリ作成・Vite + React + TypeScript セットアップ
- [ ] `vite-plugin-pwa` インストール・PWA マニフェスト設定
- [ ] `react-markdown`, `remark-gfm` インストール

### Step 2: 型定義・パーサー移植
- [ ] `viewer/src/types.ts` 作成（Item 型）
- [ ] `viewer/src/parser.ts` 作成（server/src/obsidian/parser.ts を移植）
- [ ] `viewer/src/utils/filter.ts` 作成（フィルタリング・ソート）

### Step 3: テスト作成（TDD）
> スキル: `/tdd-workflow`（テストファースト開発の手順・カバレッジ方針の参考に）
- [ ] `parser.ts` のユニットテスト
- [ ] `filter.ts` のユニットテスト
- [ ] `VaultPicker.tsx` のコンポーネントテスト
- [ ] `ItemList.tsx` のコンポーネントテスト
- [ ] `ItemCard.tsx` のコンポーネントテスト

### Step 4: コンポーネント実装
> スキル: `/frontend-patterns`（React コンポーネント設計・状態管理パターンの参考に）
- [ ] `VaultPicker.tsx` — フォルダ選択・.md 読み込み・パース
- [ ] `ItemList.tsx` — フィルター・検索・一覧表示
- [ ] `ItemCard.tsx` — Markdown レンダリング・画像表示
- [ ] `App.tsx` — 状態管理・全体統合

### Step 5: PWA 設定
> スキル: `/vite-patterns`（vite-plugin-pwa の詳細設定・オフラインキャッシュ戦略の参考に）
- [ ] `vite.config.ts` に vite-plugin-pwa 設定
- [ ] PWA アイコン追加
- [ ] オフラインキャッシュ設定（App Shell のみ。Vault データはキャッシュしない）

### Step 6: ドキュメント・図の更新
- [ ] `CLAUDE.md` 更新（R2 同期・Android Vault・PWA ビューワーのエコシステムを追記）
- [ ] `architecture.drawio` 更新（Cloudflare R2・Android Obsidian・PWA Viewer を追加）

### Step 7: Cloudflare Pages デプロイ設定
> スキル: `/deployment-patterns`（CI/CD・デプロイ手順・本番環境チェックリストの参考に）
- [ ] `viewer/` に `_redirects` または Cloudflare Pages 設定ファイル追加
- [ ] デプロイ手順を CLAUDE.md に記載

## 制約・注意事項

- File System Access API は HTTPS 必須（Cloudflare Pages でホスティングすることで対応）
- フォルダアクセス許可はセッションをまたいで保持されない（毎回選択）
- Vault データはブラウザキャッシュに保存しない（セキュリティ上の理由）
- 閲覧専用のため CRUD 操作は実装しない
