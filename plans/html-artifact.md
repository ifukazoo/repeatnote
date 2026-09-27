# HTML artifact 添付機能 仕様案

ステータス: 実装完了（K1〜K4 対応済み）。ユーザー検証待ち: V2（R2 同期で .html が Android に届くか）、V3/K5（既存画像の拡張子）

## 目的

アイテムに外部の HTML ファイル（Claude.ai の artifact など）を添付し、RepeatNote 上で JS 込みで安全に動かして閲覧できるようにする。

## インタビューでの決定事項

| No. | 論点 | 決定 |
|-----|------|------|
| 1 | 生成元 | 外部の .html ファイルを取り込む |
| 2 | JS の実行 | 実行する（sandbox iframe 内。ノートのデータには触れさせない） |
| 3 | 外部通信（CDN 等） | そのまま許可する |
| 4 | 保存場所 | `attachments/{uuid}.html`。本文末尾で `![[xxx.html]]` と参照する |
| 5 | R2 同期 | 実装前に手動で検証してから決める |
| 6 | 数・画像との関係 | 画像1つ + artifact 1つ（併用可） |
| 7 | サイズ上限 | 5MB（画像と同じ） |
| 8 | カード上の表示 | ボタン → モーダル（一覧では iframe を起動しない） |
| 9 | 本文 | 必須のまま（artifact だけのアイテムは不可） |
| 10 | localStorage | 対応しない（今回は見送る） |
| 11 | 入口 | 追加フォーム・編集フォーム（差し替え・削除）。ファイル選択のみ |
| 12 | ドラッグ&ドロップ | 行わない（画像と揃える） |
| 13 | 検索 | 本文のみ（artifact の中身は対象外） |
| 14 | モーダル | ほぼ全画面。ヘッダーにタイトルと ×。ESC はフォーカスが枠外のときだけ効く。背景クリックでは閉じない。別タブは見送る |
| 15 | 表示名 | ボタンは固定文言「🧩 artifact を開く」。モーダルのヘッダーには表示時に読んだ `<title>` を出す（なければ固定文言） |
| 16 | MCP | 今回は対応しない |

## 事前検証（実装前に確認）

- V1. Obsidian Local REST API で `attachments/*.html` を PUT/GET/DELETE できるか。GET 時の Content-Type を確認する
- V2. R2 バックアッププラグインが `.html` を同期するか（Mac mini → Android）。ユーザーが手動で確認し、同期されない場合の扱いは結果を見て決める
- V3. vault の `attachments/` にある既存画像のファイル名・拡張子の実態を一覧で確認する（images ルートを許可リスト化しても既存画像が 404 にならないようにするため）

## レビュー結果の仕分け

### 必須（計画に取り込み済み）

| No. | 指摘 | 対応 |
|-----|------|------|
| 1 | アップロード時のファイル名の拡張子をそのまま保存名に使っており、パストラバーサルと種別のすり替えが起きる（`client.ts` `uploadImage`） | 保存名はサーバーが `{uuid}.{正規化した拡張子}` で決める。拡張子は許可リストで検証する |
| 2 | サーバー側に種別・サイズの検証がない。images ルートは Obsidian の Content-Type をそのまま中継し、svg なども通す | 許可リスト（拡張子 → 種別・MIME・上限）でアップロードと配信を検証する。配信時の Content-Type は拡張子から固定し、`nosniff` を付ける。フィールド名の種別と拡張子が一致しなければ 400 |
| 3 | sandbox 内の JS から `/api/items` への POST が単純リクエストとして通り、決定事項 2 に違反する（外部サイトからの CSRF も同じ経路） | GET/HEAD 以外で `Origin` が自オリジン以外（`null` を含む）なら 403 を返すミドルウェアを追加する。Origin を送らない MCP には影響しない |
| 4 | `.htm` や大文字拡張子の扱いが、バリデーションとルートの正規表現で食い違う | 拡張子の判定は大文字小文字を区別しない。html の保存名は常に `.html` に正規化する |
| 5 | パーサーが未知の埋め込み（`![[note]]`、`.pdf`、2つ目の画像など）を取り出して書き戻さないと、review 操作で消える | 取り出すのは各種別の最後の1つだけにし（添付は本文の後ろに書き戻すため、最後を採らないと保存のたびに入れ替わる）、それ以外は本文に残す。埋め込みの間の空行はあってもなくても解釈する |
| 6 | 差し替えが「旧ファイル削除 → 新ファイル PUT → md PUT」の順で、失敗すると旧ファイルを失う。作成時も孤立ファイルが残る | 「新ファイル PUT → md PUT → 旧ファイル削除」の順にする。途中で失敗したら、アップロード済みの新ファイルを削除する。検証はすべて client 呼び出しの前にルート側で済ませる |
| 7 | フロント `api.ts` が `image`/`removeImage` のときしか multipart で送らず、artifact だけ変更した場合に黙って捨てられる | 添付の変更が1件でもあれば multipart で送る |
| 8 | charset を指定しないと、日本語の artifact が文字化けする | `Content-Type: text/html; charset=utf-8` を付ける |
| 9 | OS によっては `.html` の `file.type` が空になり、正しいファイルが弾かれる | フロントの検証は拡張子で行う。`accept=".html,.htm,text/html"` |
| 10 | テスト計画が不足している | 下の「テスト計画」に追加した |

### 要判断（J1〜J5 はすべて推奨どおり承認済み）

| No. | 指摘 | 対応しない場合の被害 | 対応のコスト | 推奨 |
|-----|------|------|------|------|
| J1 | サーバーのデータ層で画像の経路を種別ごとに複製している（`xxx_filename` フィールド、位置引数、差し替えロジック、multipart 解析）。似た要件は今回で2回目（1回目は画像）で、PDF・音声が想定に挙がっている | 3種類目で約16か所に特例を足すことになり、片方だけ直すバグが入りやすい | 計画比 +20〜30%（画像経路のリファクタと既存テストの修正） | 対応する |
| J2 | 配信ルートを種別ごとに新設している（`/api/artifacts`） | 種別ごとにルート・ファイル名検証・テストが増え、検証の実装がばらつく | 小〜中（`/api/attachments/:filename` に一本化し、`/api/images` は互換のため残す） | 対応する |
| J3 | フロントの定数・フックを種別ごとに複製している（`useArtifactUpload`） | 3種類目でフックと定数がもう1組増え、検証ロジックが3重になる | 小（`ATTACHMENT_KINDS` と `useFileAttachment(kind)`。貼り付けは画像専用のまま） | 対応する |
| J4 | サーバーが全インターフェースで待ち受けており、CLAUDE.md の「localhost のみ」と食い違う | LAN 内の端末から任意の HTML の設置やノートの改ざんができる | 極小（`hostname: '127.0.0.1'`）。別の端末からアクセスしていれば使えなくなる | 対応する（別の端末から使っていなければ） |
| J5 | タイトル取得の fetch がモーダルを閉じた後も走り、state を更新する | 閉じた後の無駄な通信と、React の警告 | 極小（AbortController） | 対応する |

### 見送り

| No. | 指摘 | 見送る理由 |
|-----|------|------|
| 1 | UI の表示（サムネイル / ボタン+モーダル）の共通化 | UX が別物なので、共通化すると過剰になる |
| 2 | 1種類で複数の添付、frontmatter へのメタデータ、レンダラーのプラグイン化 | 要件にない過剰な汎用化 |
| 3 | 旧バージョンにロールバックすると、2つ目の埋め込みが本文に漏れる | データは壊れず、ロールバックの予定もない |
| 4 | `Referrer-Policy` / `Cache-Control` の追加 | 外部 CDN に localhost の URL が参照元として送られる程度で、実害が小さい |
| 5 | `allow-popups-to-escape-sandbox` の削除 | 必須 2 の対応と CSP sandbox ヘッダーがあれば、同一オリジンへ抜ける経路はない |

## 技術設計（J1〜J5 を推奨どおりに採用した場合）

### 添付種別レジストリ（J1）

`server/src/attachments.ts` に静的な定数を1つ置く。

```ts
image: { exts: ['jpg','jpeg','png','webp','gif'], maxSize: 5MB, contentType: 拡張子から, headers: { nosniff } }
html:  { exts: ['html','htm'], saveExt: 'html', maxSize: 5MB, contentType: 'text/html; charset=utf-8',
         headers: { CSP: 'sandbox allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox', nosniff } }
```

- アップロード時の許可リスト、配信時のヘッダー、パーサーでの種別判別をすべてここから引く
- 型は `attachments: Partial<Record<AttachmentKind, string>>`（サーバー・フロント共通）。`image_filename` は廃止する（使っているのはフロントの ItemDisplay・EditForm だけで、フロントとサーバーは同時にデプロイする）
- 汎用化はこの静的な定数1つにとどめる

### データ形式

```markdown
本文

![[abc.jpg]]
![[def.html]]
```

- frontmatter は変えない
- パーサーは本文末尾の連続する `![[...]]` 行を取り出し、レジストリで種別を引く。各種別の最後の1つだけを添付として扱い、未知の拡張子・パスを含む名前・同じ種別の他の埋め込みは本文に残す
- 書き出し順はレジストリの定義順（画像 → html）

### サーバー

- `client.ts`:
  - `createItem(content, files)`、`updateItem(id, content, changes)`
  - `applyAttachmentChanges()` で種別をまとめて処理する。順序は「新ファイル PUT → md PUT → 旧ファイル削除」、失敗したら新ファイルを削除する
  - `deleteItem` はすべての添付を削除する
- `routes/items.ts`: multipart の解析をレジストリのキーでループする共通関数にする
  - フィールド名は `image` / `html`、削除は `removeImage` / `removeHtml`
  - 既存の `image` / `removeImage` はそのまま使える
- `routes/attachments.ts`: `GET /api/attachments/:filename`
  - ファイル名は `^{uuid}\.{許可拡張子}$`（大文字小文字を区別しない）で検証する
  - ヘッダーはレジストリから決める
  - `/api/images/:filename` は同じハンドラーのエイリアスとして残す
  - V3 の結果次第で、既存画像の命名に合わせて正規表現を調整する
- `index.ts`:
  - Origin チェックのミドルウェア（必須 3）
  - `hostname: '127.0.0.1'`（J4）

### フロントエンド

- `constants.ts`: `ATTACHMENT_KINDS`（accept、maxSize、エラーメッセージ）。拡張子で判定する
- `hooks/useFileAttachment.ts`: 種別を引数に取る汎用フック。プレビューはオプション。`useImageUpload` はこれに置き換え、貼り付けは画像専用のまま残す
- `api.ts`: 添付の変更が1件でもあれば multipart で送る。`getAttachmentUrl()`
- `ArtifactModal`: `<iframe src="/api/attachments/{filename}" sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox">`（`allow-same-origin` は付けない）
  - タイトルは AbortController 付きの fetch と DOMParser で取得し、テキストとして描画する
- `ItemDisplay`: 「🧩 artifact を開く」ボタン
- `AddItemForm` / `EditForm`: HTML のファイル選択、選択済みの表示、取り消し。EditForm は差し替えと削除にも対応する

### コミットの順序

1. refactor: 画像の経路をレジストリ・attachments マップ・汎用フックに移す（挙動は変えず、既存テストが通る）
2. fix: セキュリティ強化（保存名の正規化、配信の許可リスト、Origin チェック、localhost バインド）
3. feat: HTML artifact の添付
4. docs: CLAUDE.md、architecture.drawio

## スコープ外

- localStorage の代替・状態の永続化
- MCP `add_item` への artifact 対応
- ドラッグ&ドロップ
- artifact の中身の検索
- 別タブ表示

## テスト計画（サーバー側は TDD）

- parser:
  - 画像のみ / html のみ / 両方 / 順序違い / 間に空行あり / ラウンドトリップ
  - 未知の埋め込みや2つ目の画像は本文に残る
- items ルート:
  - html 付きの作成、差し替え、削除
  - 画像だけ変更したとき html に触れない（逆方向も）
  - JSON の更新で添付が消えない
  - review / master / unmaster の後も添付が残る
  - 拡張子・サイズ・種別の不一致で 400
  - `.htm` と大文字拡張子は `.html` に正規化される
  - 差し替えが失敗したとき、旧ファイルが残り、新ファイルは削除される
  - アイテムを削除すると添付も削除される
- attachments ルート:
  - html に CSP sandbox・charset・nosniff が付く
  - Obsidian の Content-Type をそのまま流さない
  - 不正なファイル名（svg、`..%2F`、拡張子なし）は 400
  - 存在しなければ 404
  - `/api/images` エイリアスが動く
- Origin ミドルウェア: 自オリジンと Origin なしは通す。`null` と他オリジンは 403
- フロント:
  - api.ts（html だけ、両方、削除）
  - `useFileAttachment`
  - ボタンの表示、モーダルの開閉（× と ESC、背景クリックでは閉じない）
  - iframe に `allow-same-origin` が付いていない
- E2E: HTML を添付して作成 → モーダルで表示（モック Obsidian サーバーを .html に対応させる）

## ドキュメント

- CLAUDE.md（Core Functionality、API エンドポイント表、Data Storage Format、テスト数、localhost バインド）
- architecture.drawio（attachments ルート）
- TODO.md はリポジトリに存在しないため、メモリの記述を確認して扱いを決める

## 実装後レビューの仕分け

### 必須（対応済み）

| No. | 指摘 | 対応 |
|-----|------|------|
| 1 | 本文末尾の `![[../../Diary/2026.png]]` のようなパスを含む埋め込みが添付として解釈され、アイテムの削除・差し替え時に attachments 外の vault ファイルが消える | パーサーは配信可能な名前だけを添付にし、削除処理でも同じ判定で弾く（81386e1） |
| 2 | `useFileAttachment` のテストがない | 貼り付け・検証エラー・プレビュー URL の解放・input のリセットのテストを追加（4ee2c6c） |
| 3 | ドキュメント（CLAUDE.md・architecture.drawio）が未更新 | CLAUDE.md・README.md・architecture.drawio を更新 |
| 4 | 計画の「最初の1つ」と実装の「最後の1つ」の食い違い | 計画を実装に合わせて修正（実装が正しい） |

### 要判断（K1〜K4 は推奨どおり承認済み）

| No. | 指摘 | 対応しない場合の被害 | 対応のコスト | 推奨 |
|-----|------|------|------|------|
| K1 | DNS リバインディングで Origin チェックを迂回できる（Origin と Host が両方 `evil.example:3001` になる） | 悪意あるサイトを開いただけで、ノートの閲覧・改ざんや HTML の設置をされうる | 極小（Host が localhost / 127.0.0.1 以外なら 403 にするミドルウェア。計画外の変更） | 対応する |
| K2 | 編集フォームで「画像を削除」の後に新しい画像を選ぶと、削除が優先されて新しい画像が捨てられる（master からある不具合。html 側は起きない） | 差し替えたつもりの画像が元画像ごと消える | 極小（サーバーを「新しいファイルがあれば差し替えを優先」に変更。計画外の変更） | 対応する |
| K3 | フォーム（追加・編集）で、添付の選択・取り消し・削除・元に戻す UI を種別ごとに手で配線している。似た要件は2回目で、PDF・音声も想定済み | 3種類目で2つのフォームにそれぞれ約5か所の追加が要り、片方だけ直すバグが入りやすい | 小〜中（`AttachmentField` 部品を1つ作り、フォームは種別の配列で回す。現在の添付の表示（サムネイル等）は種別ごとの差し込み） | 対応する |
| K4 | サーバーとフロントで、種別の一覧・拡張子・上限・sandbox フラグを二重に持っている。一致を確かめる仕組みがない | 片方だけ直すと、フロントは通すがサーバーが 400 を返す（またはその逆）ずれが黙って起きる | 小（サーバーのレジストリとフロントの定数が一致することを確かめるテストを1本追加） | 対応する |
| K5 | 旧コードは元のファイル名の拡張子で保存していたため、許可リスト外（`.jfif`、拡張子なし等）の画像があると、本文に `![[...]]` が文字列として表示される | 該当ファイルがある場合だけ表示が崩れる（データは失われない） | 事前検証 V3（既存画像の拡張子の一覧）をユーザーに実施してもらうだけ | V3 を実施して結果を見る |

### 見送り

| No. | 指摘 | 見送る理由 |
|-----|------|------|
| 1 | `removeFieldName` がサーバーとフロントに重複 | 両側のテストが `removeHtml` を固定しており、ずれれば検知できる |
| 2 | 表示用コールバック（`onImageClick` / `onArtifactOpen`）の4段バケツリレー | 表示は種別ごとに異なる UI 固有部分で、機能上の害はない |
| 3 | 作成時に `files` と `changes` を相互に変換している | 冗長なだけで、3種類目の追加箇所は増えない |
| 4 | 過剰な汎用化 | 見当たらない（対応不要） |
