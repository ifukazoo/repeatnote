# Obsidian API 500 エラー頻発の調査

## 症状

- ブラウザで開くと 500 が返ることが多い。数回リロードすると直る。

## 初期調査で判明した事実（2026-09-28）

- `~/Library/Logs/repeatnote-api.error.log` の 500 は全 44 件が同じエラー:
  `TypeError: fetch failed` / cause: `connect ECONNRESET 127.0.0.1:27123`（syscall: connect）
- つまり Obsidian から HTTP 500 が返っているのではなく、Hono → Obsidian の **TCP 接続確立時にリセット**されている。
- `listItems()`（`server/src/obsidian/client.ts`）は一覧取得後、`Promise.all` で全 `.md` を **同時に** GET している（N 件 = N 本の同時接続）。
- 1 件でも失敗すると `Promise.all` 全体が reject → GET /api/items が 500。
- エラーログにタイムスタンプがなく、どのエンドポイントで発生したか記録されていない。

## 仮説

- H1（本命）: 同時接続数が多すぎて Obsidian 側の listen backlog / 接続受付が溢れ、接続が RST される。リロードで直るのは偶然全接続が通るため。
- H2: Obsidian がスリープ復帰直後・バックグラウンド時に接続を一時的に受け付けない。
- H3: Local REST API プラグインの HTTP サーバーの一時的な不調（再起動・R2 同期中の負荷など）。

## 調査ステップ

1. アイテム件数を確認する（`curl localhost:3001/api/items`）。件数が数十〜百超なら H1 が有力。
2. 再現スクリプト: Obsidian API に対して並列度を 1 / 10 / 50 / 100 / N と変えて GET し、ECONNRESET の発生率を測る。並列度に比例して失敗するなら H1 確定。
3. 逐次（並列度 1）でもリセットされるなら H2/H3。発生時刻と Mac のスリープ・Obsidian 状態を突き合わせる（ログにタイムスタンプが必要）。
4. 必要ならエラーログに時刻・メソッド・パスを追加して数日観察（コード変更のため要承認）。

## 調査結果（2026-09-28）

- B1: アイテム 523 件 → GET /api/items 1 回で Obsidian に 524 本の同時接続。GET /api/items を 6 回連続で叩くと、最初の 2 回が 500、以降 200（ユーザー報告の症状を再現）。
- B2: Obsidian `GET /`（認証不要）を並列数別に各 3 回:
  - n=1〜300: 失敗 0
  - n=524: 1 回目 96 件 ECONNRESET、2・3 回目 0
- 結論: 仮説 H1 で確定。しばらく空いた後の最初の大量同時接続で接続受付が溢れ、リセットされる。300 並列以下では発生しない。

## 対策候補（調査結果次第。実装は別途承認）

- C1: `listItems` の同時実行数を制限（例: 5〜10 並列）。
- C2: ECONNRESET に限定した短いリトライ。
- C3: 一覧取得で 1 件失敗しても全体を 500 にしない（該当アイテムのみ除外）。ただし原因隠しにならないよう C1 とセット。

## 実施内容（2026-09-28）

- C1 を採用: `listItems` の同時接続数を 8 に制限（`mapWithConcurrency`）。C2・C3 は見送り。
- テスト: `server/src/test/client.test.ts` を追加（TDD）。
- 実環境確認: launchd サービス再起動直後から GET /api/items を 8 回 → 全て 200（523 件）、新規 ECONNRESET 0。
