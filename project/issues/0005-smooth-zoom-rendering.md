# ズーム描画のスムーズ化

## Status

closed

---

## Summary

ズームのレンダリングがカクカクしてスムーズでない。ホイールイベントごとに同期的にSvelte reactiveが更新され全DOM再描画が発生するため、requestAnimationFrameによるバッチ処理でスムーズ化する。

---

## Current Direction

現状の問題：
- ホイールイベントごとに `onZoomChange` コールバックが同期的に発火
- Svelte reactive更新 → 全SVG再描画が毎イベント発生
- デバウンス（100ms）はwheelTimeoutの管理のみで、コールバック発火は毎イベント

修正方針：`zoom-gesture.ts` でrAF（requestAnimationFrame）バッチングを導入し、1フレームに1回のみコールバックを発火させる。合わせてGPU合成ヒントとして `will-change: transform` をSVGに付与する。

```
handleWheel
  ↓ currentScale を即座に更新（入力応答性維持）
  ↓ onZoomChange は rAF 経由で 1フレームに1回のみ発火
```

---

## TODO

* [ ] `zoom-gesture.ts` の `handleWheel` にrAFバッチング処理を追加する
* [ ] `pendingScale` と `rafId` の状態管理を実装する
* [ ] `GanttTimeline.svelte` のSVG要素に `will-change: transform` CSSを追加する
* [ ] rAFバッチングで1フレーム1回のみコールバックが発火されることをテストする
* [ ] 50+ノード環境で連続ホイール操作時のレンダリング品質を確認する

---

## Notes (Append Only)

* 2026-03-21 — Issue起票。ユーザーの要望：「ズームの描画がカクカクしてスムーズではありません。改善してください」。Issue 0004（感度調整）と同じファイル（zoom-gesture.ts）を修正するため、0004完了後に実施する。
* 2026-03-21 — 実装完了。zoom-gesture.ts に `scheduleZoomCallback` メソッドを追加し、rAF バッチング導入。連続ホイールイベントを1フレームに1回のコールバック発火に制限。GanttTimeline.svelte の `.gantt-timeline` に `will-change: transform` を追加してGPU合成ヒントを付与。stop() 時に rafId をキャンセルするクリーンアップも追加。
