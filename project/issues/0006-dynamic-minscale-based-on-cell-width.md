# minorセル幅ベースの動的ズームレベル遷移

## Status

closed

---

## Summary

現在のTick定義は固定の`minScale`でズームレベル遷移を制御している。「minorの幅が2em以下になったら日→週に切り替える」のような直感的なルールを各定義に設定できるよう、`minCellWidthEm`パラメータを追加し`minScale`を動的計算に変更する。

---

## Current Direction

`zoom-scale.ts` の `TickDefinition` に `minCellWidthEm` フィールドを追加し、`minScale` を動的に計算する。

計算式:
```
minScale = (minCellWidthEm * emPx) / (minorInterval_days * BASE_DAY_WIDTH)
```

デフォルト値:
- 時間単位（1h, 3h, 6h, 12h）: 2em
- 日単位（1d）: 2em（ユーザー要件）
- 週・月・四半期単位: 4em
- フォールバック（1年）: 0（常に適用）

---

## TODO

* [ ] `TickDefinition` インターフェースに `minCellWidthEm: number` を追加する
* [ ] `BASE_DAY_WIDTH` と `DEFAULT_EM_PX` をモジュールレベルの export 定数に昇格させる
* [ ] `calculateMinScale(def, emPx)` 関数を追加する
* [ ] `TICK_DEFINITIONS` の各エントリに `minCellWidthEm` を設定する
* [ ] `getTickDefinitionForScale` を動的minScale計算に変更する
* [ ] `addCustomTickDefinition` / `updateTickDefinition` のソートロジックを更新する

---

## Notes (Append Only)

* 2026-03-21 — Issue起票。ユーザーの要望：「majorが月でminorが日の時は、minorの幅が2em以下になってしまう縮尺までは日表示にして、それ以下になったら週にして。すべての設定でそのminor単位の幅がいくつまで小さくできるかのパラメータを設定して。デフォルトは4em。上記日表示のみ2em」。時間単位も2em、週は4emとすることをユーザー確認済み。
* 2026-03-22 — 実装完了。zoom-scale.ts に `minCellWidthEm` フィールド、`calculateMinScale()` 関数、`syncMinScales()` 関数を追加。`BASE_DAY_WIDTH`(40)と`DEFAULT_EM_PX`(16)をモジュールレベルexport定数に昇格。各TICK_DEFINITIONSエントリに minCellWidthEm を設定（時間・日: 2em、週: 4em/3em、月: 3em、フォールバック: 0）。初期化時に syncMinScales() で minScale を動的計算し降順ソート。
