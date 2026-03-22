# minorTick設定修正（2日・4日単位の削除）

## Status

closed

---

## Summary

日付ヘッダーのminorTickについて、majorが月のとき、minorの日単位は「1日」「1週間」のいずれかのみとする。現在「2日」「4日」の設定が存在するため削除する。

---

## Current Direction

`zoom-scale.ts` の `TICK_DEFINITIONS` から以下のエントリを削除する：

- `minScale: 0.48`（2日単位）
- `minScale: 0.24`（4日単位）

削除後、1日（minScale: 0.95）から1週間への遷移が直接になるため、1週間エントリの `minScale` 境界値を `0.17` から `0.45` に引き上げる（scale=0.45のとき1週間セル幅=126px となり視認性が適正）。

2週間（minScale: 0.085）は削除しない。

---

## TODO

* [ ] `zoom-scale.ts` の `TICK_DEFINITIONS` から2日エントリ（minScale: 0.48）を削除する
* [ ] `zoom-scale.ts` の `TICK_DEFINITIONS` から4日エントリ（minScale: 0.24）を削除する
* [ ] 1週間エントリの `minScale` を `0.17` → `0.45` に変更する
* [ ] `getTickDefinitionForScale(0.5)` が1日を返すことをテストする
* [ ] `getTickDefinitionForScale(0.3)` が1週間を返すことをテストする

---

## Notes (Append Only)

* 2026-03-21 — Issue起票。ユーザーの要望：「majorが月のとき、minorの日の単位は1日・1週間のいずれかにする。今の設定は2日があるので削除する」。2日と4日の両方が対象。2週間は削除対象外（ユーザー確認済み）。
* 2026-03-21 — 実装完了。zoom-scale.ts の TICK_DEFINITIONS から2日（minScale:0.48）と4日（minScale:0.24）を削除。1週間エントリの minScale を 0.17 → 0.45 に変更。
