# 0015: onBarDragEnd コールバックの追加

## ステータス

Closed

## 概要

他プロジェクト（markdownEditor-for-mywork）のドラッグ操作パフォーマンス改善（obs-0013）に対応するため、バーのドラッグ確定時（mouseup）に最終位置を通知する `onBarDragEnd` コールバックを追加する。

現在の `onBarDrag` は mousemove のたびに呼ばれるため、プラグイン側でドラッグ確定タイミングを知る手段がなく、毎フレーム vault.modify() が呼ばれてしまっている。

## 変更ファイル

- `src/types.ts` — `GanttEventHandlers` に `onBarDragEnd` を追加
- `src/utils/drag-handler.ts` — `DragHandlerDeps`・`DragState` を拡張し mouseup 時に通知

## 完了条件

- `GanttEventHandlers.onBarDragEnd` が型定義に存在すること
- mouseup 時に `onBarDragEnd` が呼ばれること
- mousemove 中は `onBarDragEnd` が呼ばれないこと
- 全テストパス

## History

### 2026-03-25 00:00

User Instruction: obs-0013-drag-performance-improvement.md の「ライブラリ変更 1」セクションを実装する
Change: Issue 起票
Rationale: ガバナンスルールに従い、実装前に Issue を作成する

### 2026-03-26 13:51

User Instruction: 実装を進める
Change:
- `src/types.ts`: `GanttEventHandlers` に `onBarDragEnd?` を追加
- `src/utils/drag-handler.ts`: `DragState` に `currentStart`/`currentEnd` を追加、`handleMouseMove` でトラッキング、`handleMouseUp` で `onBarDragEnd` を呼び出す
- `tests/utils/drag-handler.test.ts`: 新規作成（5テスト）
Rationale: ライブラリ変更 1 の実装。新規テスト5件すべてパス。zoom-gesture の3件失敗は変更前から存在する既存問題。
