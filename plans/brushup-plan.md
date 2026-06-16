# RepeatNote ブラッシュアップ計画

プロジェクト全体の品質・保守性・開発体験を向上させるための改善計画。

## Phase 1: README の改善

README はプロジェクトの顔。動くアプリであることを一目で伝える。

- [ ] **1-1**: スクリーンショット / デモ GIF を README に追加
- [ ] **1-2**: 技術スタック・アーキテクチャ図を README に埋め込み

## Phase 2: CI/CD

テスト・型チェック・lint を自動実行し、品質を継続的に担保する。

- [ ] **2-1**: server 側に ESLint を導入（CI の前提条件）
- [ ] **2-2**: GitHub Actions で lint + type check + test を自動実行 + ステータスバッジを README に表示
- [ ] **2-3**: テストカバレッジ計測・可視化を CI に組み込み

## Phase 3: テスト・品質強化

ユニットテストに加え、E2E テストと Error Boundary で品質を底上げする。

- [ ] **3-1**: Playwright で主要フローの E2E テスト追加（作成→復習→マスター）
- [ ] **3-2**: E2E テストを CI に組み込み
- [ ] **3-3**: React Error Boundary の追加

> **注**: E2E テストは Obsidian Local REST API に依存する。CI 上ではモック API サーバーを用意するなど、実行戦略を 3-2 着手前に決定すること。

## 進め方

Phase 1 → 2 → 3 の順に進める。
