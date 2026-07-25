# Issue #0022: ツリーペインとタイムラインのスクロール位置同期の不具合修正

## ステータス

Open

## 概要

ツリーペインとガント領域（タイムライン）のスクロールが合わない、または縦方向の表示位置がズレることがあるとの報告。特にサブタスクを展開している（行数が多い）ときに顕著とのこと。`src/utils/scroll-sync.ts` の同期処理方式が適切かどうかを調査し、不具合があれば修正する。

## 調査結果

`npm run demo`（Vite）+ Playwright（ヘッドレスChromium）でツリー行・タイムラインバーの実測座標を比較し、以下を確認・棄却した。

- ヘッダー高さ（`.gantt-tree-header` / `.gantt-timeline-header-wrapper`）: 両者とも実測 60px で一致。ズレなし。
- サブタスク折り畳み・展開（`toggleCollapse`）: `visibleNodes.length` が変化しても、`yWindow.totalHeight`（`totalRows * rowHeight`）と `calculateTimelineHeight`（同じ式）が一致するため、両ペインの `scrollHeight` は常に一致する。折り畳み前後でツリー行とタイムラインバーの Y 座標差分（デザイン上のバー内パディング起因の定数オフセット）は完全に一定で、ズレの蓄積は見られなかった。
- 右クリックドラッグでのパン操作（`handlePanMove` / `suppressSync`）: プログラム的な `scrollTop` 変更で発火する `scroll` イベントは非同期のため、`isScrolling` フラグが解除された後にツリー側へも正しく伝播する。ズレは再現しなかった。
- スクロール終端でのクランプ（コンテンツ縮小時のブラウザによる自動 `scrollTop` 補正）: 両ペインの `scrollHeight`/`clientHeight` が常に一致するため、クランプ後の値も一致する。

**再現した不具合**: ツールバーの「ツリーペインを表示/非表示」ボタン（`◀`/`▶`、`toggleTreePane`）でツリーペインを非表示→再表示すると、`{#if showTreePane}` により `treeWrapperElement` の DOM が破棄・再生成される。再生成された要素の `scrollTop` は既定値の `0` に初期化されるが、タイムライン側の `scrollTop` は変化しないため、再表示直後にツリーペインだけが先頭に戻り、タイムラインとの縦スクロール位置が一致しなくなる（実測: タイムライン `scrollTop=400` のままツリーペインは `0`）。

サブタスクを展開している状態はツリーペインの全体高さ（スクロール可能距離）を大きくするため、このズレが発生した際の見た目のギャップ（ツリー側が先頭、タイムライン側が数百〜数千pxスクロールした状態）がより大きく・目立ちやすくなると考えられる。展開操作そのものが直接ズレを生む再現は取れなかったため、上記のツリーペイン表示切替が根本原因と判断する。

## 修正方針

- `treeWrapperElement` が新たにバインドされた（＝ツリーペインが表示された）タイミングで、`timelineWrapperElement.scrollTop` の値へ明示的に同期する処理を追加する。
- `showTreePane` の変化を監視するリアクティブ文で、ペイン表示直後に `treeWrapperElement.scrollTop = timelineWrapperElement.scrollTop` を実行する。

## TODO

- [x] Issue #0022 作成・調査実施
- [x] `GanttChart.svelte`: ツリーペイン再表示時の `scrollTop` 明示同期を追加
- [x] 修正確認（Playwright実機確認。DOM要素の破棄・再生成に依存するため単体テストでの再現は行わず、手動確認手順を本メモに記録）
- [x] 全テスト通過（既存失敗3件は変更前から存在。`tests/utils/zoom-gesture.test.ts`）
- [ ] ユーザー承認後にクローズ

## 修正内容

`GanttChart.svelte` に以下のリアクティブ文を追加した（`treeWrapperElement` が新たにバインドされるたびに実行される）。

```svelte
$: if (treeWrapperElement && timelineWrapperElement) {
  treeWrapperElement.scrollTop = timelineWrapperElement.scrollTop;
}
```

## 動作確認

Vite開発サーバー + Playwright（ヘッドレスChromium）で以下を確認。

1. タイムラインを `scrollTop = 400` までスクロール。
2. ツリーペイン非表示ボタン（`◀`）をクリック → 再表示ボタン（`▶`）をクリック。
3. 修正前: 再表示後 `treeWrapperElement.scrollTop` が `0` にリセットされ、タイムライン（`400`）とズレる。
4. 修正後: 再表示直後に `treeWrapperElement.scrollTop` が `400` に同期され、ズレが解消することを確認。

なお、サブタスク折り畳み・展開操作単体、右クリックドラッグパン、スクロール終端でのブラウザ自動クランプについては、実測で両ペインの `scrollHeight`/`clientHeight`/`scrollTop` が常に一致することを確認済みで、ズレの再現は取れなかった（詳細は上記「調査結果」参照）。

## 関連スペック

- project/specs/system-baseline.spec.md

## 作成日

2026-07-23
