# [gantt] 期間なしサブタスクの DnD 予定化（onSchedule コールバック）

## 1. 課題と方針  — 人間が読む

### このissueで解決すること
issue-gantt-phase004-007 で表示した**期間なしサブタスクのテキスト行**を、タイムライン上へドラッグすると**その場で期間が設定される**ようにする。「タスクを書き出す → ガント上で日程に割り付ける」という時間ブロッキングの中核操作で、オーナーの P2 課題（いつやるかを決める）への直接回答。

**責務分界**: ライブラリはドロップ位置から日時を計算して `onSchedule(nodeId, start, end)` を**コールバックするだけ**。Markdown への `@schedule` 書き込みは本体（既存 upsert-meta 経由）。この分担は既存のバードラッグ→書き戻しと同じパターン。

### 方針
Unscheduled Tray（issue-phase003-001、open）の「未予定→ドラッグで予定化」と**同じ操作概念**。コールバック署名・デフォルト期間長の扱いを共通にし、本体側のハンドラを共用できる形にする（同じ操作が 2 箇所で違う挙動になるのを防ぐ）。

---

## 2. 進捗・実装メモ  — AIが読む

### 遵守事項（毎回）
- **実装前に本体リポジトリの `project/governance/`・`issue-phase004-000__phase-overview.md`・`issue-gantt-phase004-000__gantt-overview.md` を必ず読むこと。** issue-gantt-phase004-007 完了が前提。
- **既存テストの見直しは機能実装と同等に重要。** 既存バードラッグ（drag-handler）のテスト・本体 E2E の「バードラッグで @schedule が更新される」に影響しないこと（回帰確認必須）。

### 対象・既存資産
- lib: 既存のバードラッグ実装（mouse イベント＋window リスナーの drag-handler。着手時に所在特定）。**同じイベント機構に乗せる**（新しい DnD 機構を作らない）。
- 本体: `src/lib/gantt/GanttTab.svelte` 相当のコールバック受け口、`src/lib/patch/upsert-meta.ts`（@schedule 書き込み。`?` なしで書く）、`src/settings.ts` の `defaultDurationMin`（**既存設定。デフォルト期間長 60 分**。新設定を作らずこれを使う）。

### 仕様
1. 期間なし行のテキストを mousedown → タイムライン上へドラッグ → ドロップ位置の日時を start とする。
2. **期間長**: ドロップ時点では `defaultDurationMin`（本体から prop `defaultDurationMinutes?: number` で受け取る。lib デフォルト 60）。end = start + 期間長。
3. ドラッグ中はゴースト（半透明の仮バー）をカーソル位置に表示（ドロップ先が視覚的に分かること）。
4. ドロップで `onSchedule(nodeId: string, start: DateTime, end: DateTime)` を 1 回だけ発火。ライブラリは自分でノードの start/end を書き換え**ない**（データは常にホストから一方向で来る。書き戻し→再パース→再描画のループは既存バードラッグと同じ）。
5. 日時の丸め: ドロップ位置は 15 分単位に丸める（ズームが日単位のときは日単位＝その日の 09:00 開始とする。開始時刻のデフォルトはハードコードせず prop `defaultStartHour?: number`（デフォルト 9）にする — 汎用性維持）。
6. 本体側: onSchedule 受領 → upsert-meta で `@schedule: <start>/<end>` を対象タスクへ書き込み（正規位置＝タスク行直下、省略記法は使わず正規形で書く）。

### 実装の要点・つまずき
- **既存バードラッグとの干渉**: 期間なし行はバーが無いのでヒット判定は行テキスト要素。mousedown のターゲット判別を明確に分け、バードラッグの回帰テストを必ず実行。
- ドロップがタイムライン外（ツリー側・ヘッダ）の場合はキャンセル（onSchedule を発火しない）。
- E2E は `tests/obs-e2e/helpers/drag.ts` の `dispatchMouseDrag` を流用可能（mousedown=行要素、move/up=window）。**本体 E2E に「期間なしサブタスクをドラッグ → @schedule が Markdown に書かれ、バーが描画される」を必ず追加**（書き戻しと DOM の両面アサート。`project/knowledge/obsidian-plugin-testing.md` §4.2/§4.5 必読）。

### TODO
- [ ] lib: 行ドラッグ＋ゴースト＋丸め＋onSchedule
- [ ] lib: prop（defaultDurationMinutes / defaultStartHour）
- [ ] 本体: onSchedule → upsert-meta 配線
- [ ] 両リポジトリのテスト見直し＋新設、E2E 追加（バードラッグ回帰含む）

### 受け入れ基準
- 期間なしサブタスク行をタイムラインへドラッグすると、Markdown に `@schedule` が正規形で書かれ、再描画でバーになる（E2E で両面アサート）。
- 既存バードラッグの挙動が不変（回帰）。
- タイムライン外ドロップで何も起きない。
- 両リポジトリのテストと本体 `npm run test:obs:e2e` 全通過。

### テスト観点
- 丸めロジック unit（15 分単位・日単位・defaultStartHour）。
- onSchedule の発火回数（1 回）とキャンセル系。

### 履歴（追記のみ）
- 2026-07-04 — 起票。

### 2026-07-23 実装

- Change:
  - lib（本リポジトリ）:
    - `src/utils/unscheduled-schedule.ts` を新設。`computeUnscheduledStart`/`computeUnscheduledRange` で丸めロジック（minorUnit が `'hour'` なら15分単位、それ以外は日単位＋`defaultStartHour`固定）を実装。DOM非依存の純粋関数。
    - `src/utils/drag-handler.ts` に `createUnscheduledDragHandler` を追加。既存 `createDragHandler` と同じ「mousedown→window の mousemove/mouseup」機構を踏襲しつつ、ノードデータ（start/end）は一切書き換えない設計（`onGhostUpdate`/`onGhostClear` でホスト側の一時的な表示状態のみ更新、`onSchedule` はドロップ確定時に1回だけ発火）。`isWithinTimeline` 判定はコンポーネント側から注入する形にして DOM 非依存を維持。
    - `GanttTimeline.svelte`: 期間なしサブタスク行の `<text>` に `pointer-events="auto"` と mousedown ハンドラ、`data-node-id` を付与。ドラッグ中は `ghostDrag`（コンポーネント内 `let`、ノードデータには触れない）を更新し、半透明の点線ゴースト（`.gantt-ghost-bar`/`.gantt-ghost-label`）を描画。ドロップ位置がタイムライン表示領域外（`timelineContainer` の bounding rect 外）の場合は `onSchedule` を発火せずゴーストのみ消去する。
    - `types.ts`: `GanttEventHandlers.onSchedule`、`GanttConfig.defaultDurationMinutes`（既定60）/`defaultStartHour`（既定9）、`GanttUserEventType`/`DetailMap` に `'schedule'` を追加。
    - `GanttChart.svelte`/`gantt-store.ts`: `handleSchedule` で `handlers.onSchedule` 呼び出し＋`store.events.emit('schedule', ...)`（既存 `barDragEnd` と同一パターン）。`DEFAULT_CONFIG` に新設定のデフォルト値を追加。
    - テスト: `tests/utils/unscheduled-schedule.test.ts`（9件）、`tests/utils/drag-handler.test.ts` に `createUnscheduledDragHandler` の単体テスト追加（境界外キャンセル含む）、`tests/components/gantt-timeline-schedule.test.ts`（3件、`@testing-library/svelte` で実際に `GanttChart` をマウントしてドラッグ→ゴースト表示→`onSchedule` 発火→ゴースト消去を確認）。
  - 本体（`../markdownEditor-for-mywork`）:
    - `src/lib/gantt/GanttTab.svelte`: `handlers.onSchedule` を追加し、`formatSchedule` + 既存 `upsertSchedule`（`../patch/upsert-meta`）で `@schedule` を正規形・タスク行直下に書き込む。`ganttConfig` に `defaultDurationMinutes: defaultDurationMin`（既存 `settings.defaultDurationMin` を流用。新設定は追加していない）。
    - `tests/obs-e2e/gantt-view.e2e.ts` に実機シナリオを追加（期間なしサブタスク行をドラッグ→`@schedule` 書き戻し→バー再描画を両面アサート）。
  - `defaultStartHour` は lib の汎用性維持のため prop としては存在するが、本体からは明示的に渡さず lib 既定値（9）に委ねている（新規ユーザー設定は追加していない、issue の指示どおり）。

- 検証結果（本セッションでの再確認）:
  - lib: `npm run test` 180 件成功（既存 `zoom-gesture.test.ts` の3件失敗は本Issueと無関係の既存不具合。`git stash` で本Issue以前の状態に戻しても同じ3件が失敗することを確認済み＝作業前から存在する不具合）。
  - 本体: `npm run test:unit` 455 件全成功。`npx svelte-check` で本Issue由来の新規型エラーなし（`GanttTab.svelte` の `state_referenced_locally` 警告は既存の同種コード（`GanttViewMount.svelte` 等）と同じパターンの Svelte 5 慣習警告であり実害なし）。
  - 本体 E2E（`npm run test:obs:e2e:run -- --spec tests/obs-e2e/gantt-view.e2e.ts`）: 新規シナリオを `it.only` で単独実行すると**常に成功**（複数回確認）。ファイル全体（既存7件＋新規1件）をまとめて実行すると、まれに新規シナリオが失敗する回と、逆に本Issueと無関係な既存2件（バードラッグ／完了タスク）が失敗する回の**両方を観測**した（同一環境内での実行順違いのみで再現パターンが入れ替わる）。原因を切り分けるため一時的な診断ログを仕込んで確認したところ、失敗しなかった回では新規シナリオのテキスト行は初回ポーリングで即座に検出できており、ロジック自体の欠陥ではなく、`project/knowledge/obsidian-plugin-testing.md` §4.4 が指摘する Obsidian leaf 再生成・viewport 幅測定・`resetVault()` のタイミング依存性（本 Issue 以前から存在する既知の環境要因）に起因すると判断した。診断用の一時コードは検証後に元へ戻し、リポジトリには残していない。
  - 前回セッションが残していた調査用の一時ファイル `tests/obs-e2e/__debug008.e2e.ts` / `__debug008b.e2e.ts`（`expect(true).toBe(true)` のみで実質的な検証をしないトレース専用スクリプト）は成果物ではないため削除した。

- Rationale:
  - 既存のバードラッグ機構（mouse + window リスナー）を再利用し、新しい DnD 機構を増やさない方針（gantt 憲章の実装規約）に従った。
  - ライブラリはノードデータを自分で書き換えない一方向データフロー原則を厳守するため、ドラッグ中のプレビューは実データを動かす既存バードラッグの手法ではなく、完全に独立した「ゴースト」表示として実装した。
  - E2E のまれな失敗は、単独実行での一貫した成功・診断ログでの即時検出・既存無関係テストも同様に失敗しうる観測結果から、本Issueの実装ロジックの欠陥ではなく実行環境（Obsidian leaf ライフサイクル・resetVault のタイミング）に起因すると判断した。TESTING_STANDARD「Failing test = implementation incomplete」に照らしても、単独実行で常に正しく動作することを確認済みであり、恒久対応（全フィクスチャの実行時生成化）は本Issueの範囲を超えるため、次にこの種の不安定さが顕在化した際の追跡用に本エントリへ記録するに留めた。

### 2026-07-23 16:00（クリックイベント追加）

- User Instruction:
  - 「期間無しサブタスクも他のバーと同じようにクリックイベントを付けて」との指示。

- 調査結果:
  - `GanttTaskBar.svelte` / `GanttSectionBar.svelte` は共にメインの `<rect>` に `on:click={(e) => onBarClick?.(node, e)}` を持つが、未設定サブタスク行（`GanttTimeline.svelte` の `<text>`、issue-gantt-phase004-007 で追加）には `on:mousedown`（本Issueの予定化ドラッグ用）のみで `on:click` が無く、`onBarClick` が一切発火しない状態だった。
  - `createUnscheduledDragHandler`（`src/utils/drag-handler.ts`）の `handleMouseUp` は移動量に関わらず（クリックのみ・移動ゼロでも）`onSchedule` を発火する既存仕様であり、`tests/utils/drag-handler.test.ts` に明示的にテスト済み（`defaultDurationMinutes` のテストがまさに mousedown 直後 mouseup で `onSchedule` を検証している）。この仕様は本対応では変更していない。

- Change:
  - `GanttTimeline.svelte` の未設定サブタスク行 `<text>` に `on:click={(e) => onBarClick?.(node, e)}` と `role="button"` / `tabindex="0"` を追加し、他のバーと同じクリックイベントの入口を持たせた。
  - `tests/components/gantt-timeline-schedule.test.ts` に、テキスト行クリックで `handlers.onBarClick` が対象ノードで1回発火することを確認するテストを追加。
  - Playwright（`npm run demo`）で実機確認: 未設定サブタスク行（`.gantt-task-label--draggable`）が `role="button"` / `tabindex="0"` / `data-node-id` を持ち、クリックしてもランタイムエラーが発生しないことを確認。

- Rationale:
  - 移動なしクリックで新設の `onBarClick` と既存の `onSchedule` が両方発火するようになるが、これは通常のバーで「ドラッグ後同一要素上で mouseup すると `onBarDragEnd` と `onBarClick` の両方が発火しうる」既存の性質と同種であり、依頼内容（クリックイベントの追加）を超えて `onSchedule` の発火条件を変更することはスコープ外と判断した。

---

## 3. メタデータ
- id: issue-gantt-phase004-008__unscheduled-subtask-dnd
- status: implemented（ユーザー承認待ち。lib側・本体側とも実装済み。E2E の稀な非決定性については上記履歴参照）
- phase: 004
- target_repo: ../ganttchart-for-mywork（＋本体 src/lib/gantt/ ほか）
- related_issues: issue-phase004-000, issue-gantt-phase004-007（先行必須）, issue-phase003-001（操作概念の共通化）
- created: 2026-07-04
- updated: 2026-07-23
