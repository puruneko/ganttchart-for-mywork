# X 軸仮想スクロールのオーバースキャン量を config で指定可能にする

## Status

closed

---

## Summary

Issue 0011 で実装した X 軸仮想スクロールのオーバースキャン幅は `viewportWidth × 0.5`（片側）に固定されている。ネットワークが遅い環境や大型モニターではちらつきが出る場合があるため、`GanttConfig` に `xOverscanPx` フィールドを追加してユーザーが調整できるようにする。

---

## 仕様

### GanttConfig に追加するフィールド

```typescript
/** X 軸仮想スクロールのオーバースキャン幅（px、片側）。デフォルト: 500 */
xOverscanPx?: number;
```

- デフォルト値: `500`（px）
- 0 を指定するとオーバースキャンなし（ビューポートぴったりのみ描画）
- 大きい値ほどスクロール時のちらつきが減るが、描画要素数が増える

### DEFAULT_CONFIG

```typescript
xOverscanPx: 500,
```

### GanttChart.svelte

`calculateXWindow` の第 5 引数に `chartConfig.xOverscanPx` を渡す。

### GanttConfigPanel.svelte

「レイアウト」セクションに `xOverscanPx` のスライダーを追加。
- 範囲: 0 〜 2000 px
- ステップ: 100

---

## 対象ファイル

| ファイル | 変更種別 |
|----------|----------|
| `src/types.ts` | `xOverscanPx?: number` を `GanttConfig` に追加 |
| `src/core/gantt-store.ts` | `DEFAULT_CONFIG` に `xOverscanPx: 500` を追加 |
| `src/components/GanttChart.svelte` | `calculateXWindow` に `xOverscanPx` を渡す |
| `src/components/GanttConfigPanel.svelte` | スライダー追加 |
| `tests/core/gantt-store.test.ts` | デフォルト値テスト追加 |

---

## TODO

* [x] `src/types.ts`: `xOverscanPx?: number` を追加
* [x] `src/core/gantt-store.ts`: `DEFAULT_CONFIG` に `xOverscanPx: 500` を追加
* [x] `src/components/GanttChart.svelte`: `calculateXWindow` に渡す
* [x] `src/components/GanttConfigPanel.svelte`: スライダー追加
* [x] `tests/core/gantt-store.test.ts`: テスト追加
* [x] `npm test` / `npm run check` で検証

---

## Notes (Append Only)

* 2026-03-23 — Issue 起票。Issue 0011 の X 軸仮想スクロールに config 対応を追加。
* 2026-03-23 — 実装完了。テスト 2件追加（98件中95通過）。svelte-check 新規エラーなし。
