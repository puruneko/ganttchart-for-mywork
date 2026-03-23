# 初期表示位置を現在日時にスクロール

## Status

closed

---

## Summary

現在、ガントチャートの初期表示位置は `extendedDateRange` の先頭（左端）になっており、今日の日付が中央に表示されない。マウント後に自動的に現在日時の位置にスクロールすることで、ユーザーが手動でスクロールする手間をなくす。

---

## 仕様

### 動作

- チャートマウント直後、タイムラインが現在日時を中央に表示する位置へ自動スクロールする
- 既存の `scrollToToday()` メソッドをマウント時に内部で呼び出す
- `initExtendedDateRange` で範囲を確定させた後、次の `requestAnimationFrame` 内で実行する

### 実装箇所

`GanttChart.svelte` の `onMount` 内、`initExtendedDateRange` の後に追加:

```typescript
requestAnimationFrame(() => {
  lifecycle.startRendering();
  requestAnimationFrame(() => {
    // ...既存の処理...
    // 初期スクロールを今日の日付に設定
    scrollToToday();
  });
});
```

### スコープ外

- 「初期日付をconfigで指定する」機能は別 Issue で対応
- `scrollToToday()` が現在日時を extendedDateRange 外と判定する場合でも既存ロジックで範囲拡張が行われる

---

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/components/GanttChart.svelte` | `onMount` 内で `scrollToToday()` を呼び出す |

---

## TODO

* [x] `src/components/GanttChart.svelte`: `onMount` の `requestAnimationFrame` チェーン内で `scrollToToday()` を呼び出す
* [x] `npm run check` で検証

---

## Notes (Append Only)

* 2026-03-23 — Issue 起票。現状は extendedDateRange 先頭が初期表示位置になっており、今日が見えない。
* 2026-03-23 — 実装完了。onMount の2重 rAF チェーン内で scrollToToday() を呼び出すことで、DOM 確定後に今日の日付へ自動スクロールする。
