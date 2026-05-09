# 移行実行手順書: Cloudflare → Obsidian

## 前提条件

- [ ] `wrangler login` 済み（または `CLOUDFLARE_API_TOKEN` 環境変数が設定済み）
- [ ] Obsidian で「Local REST API」プラグインが有効化されている
- [ ] vault パスが存在する: `/Users/ki/Obsidian/MyVault/repeatnote/`

## 実行手順

### 1. ドライラン（確認）

```bash
node scripts/migrate-from-cloudflare.mjs --dry-run
```

出力例を確認して、アイテム件数・画像件数が期待通りか確認する。

### 2. 本番実行

```bash
node scripts/migrate-from-cloudflare.mjs
```

### 3. 確認

```bash
# 作成された .md ファイルの件数確認
ls /Users/ki/Obsidian/MyVault/repeatnote/*.md | wc -l

# 画像ファイルの件数確認
ls /Users/ki/Obsidian/MyVault/repeatnote/attachments/ | wc -l
```

Obsidian を開いて `repeatnote/` フォルダにファイルが表示されることを確認する。

## ロールバック

移行スクリプトは Cloudflare 上のデータを変更しないため、いつでも元に戻せる。

```bash
# 移行ファイルをすべて削除（やり直したい場合）
rm -rf /Users/ki/Obsidian/MyVault/repeatnote/*.md
rm -rf /Users/ki/Obsidian/MyVault/repeatnote/attachments/
```

## 注意事項

- スクリプトは各アイテムに新しい UUID を割り当てる（D1 の数値 ID とは異なる）
- 画像ダウンロードに失敗した場合も、テキストのアイテムは作成される
- `next_review` フィールドは ISO 文字列から `YYYY-MM-DD` 形式に変換される
