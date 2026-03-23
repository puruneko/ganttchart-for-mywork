# 設定パネル UI の追加

## Status

closed

---

## Summary

`GanttConfig` で設定できる項目（`rowHeight`・`treePaneWidth`・`indentSize`・`showTreePane`・`snapDurationMap`・`mode`）が、現状はコード上でしか変更できない。設定ボタンを追加し、パネル UI から対話的に変更できるようにする。

---

## Current Direction

- `GanttConfigPanel.svelte` を新規作成し、GanttConfig 項目の編集 UI を提供する
- `GanttChart.svelte` に設定ボタンを追加し、パネルの表示/非表示をトグルする
- 既存の Tick Editor ボタン（`⚙`）と設定ボタンを整理し、ツールバーとして並べる
- パネルで変更した値は即座に `store.updateConfig()` に反映する

### 対象 Config 項目

| 項目 | 入力タイプ | 範囲/選択肢 |
|---|---|---|
| `mode` | select | controlled / uncontrolled |
| `rowHeight` | range + 数値表示 | 24 〜 80px |
| `treePaneWidth` | range + 数値表示 | 150 〜 500px |
| `indentSize` | range + 数値表示 | 8 〜 40px |
| `showTreePane` | checkbox | true / false |
| `snapDurationMap.year` | select | 1日・3日・1週・2週・1ヶ月 |
| `snapDurationMap.month` | select | 6時間・12時間・1日・3日・1週 |
| `snapDurationMap.week` | select | 1時間・3時間・6時間・12時間・1日 |
| `snapDurationMap.day` | select | 15分・30分・1時間・3時間・6時間 |

除外: `classPrefix`（開発者設定）・`dayWidth`（ズームUIで制御済み）

### UI レイアウト

- 設定ボタンは既存のツールバーボタン群の右側に追加（`☰` アイコン）
- パネルは右端に固定表示（Tick Editor パネルと同様の構造）
- `snapDurationMap` はセクションにまとめてラベル付き select で表示

---

## TODO

* [x] `src/components/GanttConfigPanel.svelte` を新規作成
* [x] `GanttChart.svelte` に設定ボタン追加（`showConfigPanel` トグル）
* [x] `GanttChart.svelte` のテンプレートにパネル表示部分を追加
* [x] `GanttChart.svelte` の style にパネル用スタイルを追加

---

## Notes (Append Only)

* 2026-03-23 — Issue起票。実装完了。GanttConfigPanel.svelte 新規作成、GanttChart.svelte に ☰ ボタンとパネルを追加。テスト 51件通過。ユーザーの要望：「設定ボタンを作成し、configで設定できるものをUIでも設定できるようにしてください」。
