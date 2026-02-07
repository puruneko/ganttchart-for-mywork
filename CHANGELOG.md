# 変更履歴

このファイルには、プロジェクトの主要な変更が記録されます。

## [0.1.0] - 2026-02-07

### 追加
- ガントチャートライブラリの初期実装
- TypeScript + Svelte 4での汎用ライブラリ
- Controlled/Uncontrolled両モード対応
- SVGベースのタイムライン描画
- 階層構造サポート（project/section/subsection/task）
- 折り畳み機能
- 包括的なテストスイート（38テスト、100%合格）
- 完全な日本語コメント
- デモ実行スクリプト（`npm run demo`）

### ドキュメント
- すべてのコメントを日本語化
- すべての関数・変数・型に詳細な説明を追加
- README.md（使用ガイド）
- ARCHITECTURE.md（設計ドキュメント）
- IMPLEMENTATION_SUMMARY.md（実装詳細）
- PROJECT_SUMMARY.md（日本語サマリー）
- DELIVERABLES.md（成果物一覧）

### 技術仕様
- TypeScript strict mode
- Svelte 4（Svelte 5移行対応設計）
- Luxon（日付計算）
- Vitest（テスト）
- Vite（ビルド）

### Git管理
- 適切なコミットメッセージ（変更理由を明記）
- 機能ごとの論理的なコミット分割
- .gitignore設定
