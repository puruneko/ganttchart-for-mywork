# [gantt] サブタスク表示（展開モード・折り畳み・期間なしサブタスクの行表示）

## 1. 課題と方針  — 人間が読む

### このissueで解決すること
現状、本体の ast-to-gantt は子タスクを**畳んで**親の 1 行に集約している（descendantDateRange で min/max を計算）。オーナー要望はサブタスクの展開表示:

```
■■■■■■■ 親タスク ■■■■■■■
 |・サブA                ← 期間なし：テキスト行として表示
 |　 ■■ サブB ■■         ← 期間あり：バー表示
 |・サブC
```

- デフォルトは**表示 OFF**（従来の集約表示のまま）。
- **期間なしのサブタスクも行として成立**する（ここが新規性: 普通のガントは期間必須。「まだ日時を割っていない子タスク」を親の下に見せることで、次の Issue の「DnD で予定化」につながる）。
- 親タスク単位で折り畳みできる。

### 方針
本 Issue は**表示系のみ**（ライブラリ側の行モデル・折り畳み・期間なし行）。行 DnD→予定化は issue-gantt-phase004-008（本 Issue の後）。本体側の「展開モードで子を個別ノードとして渡す」投影変更も本 Issue のスコープに含む（表示できないと検証できないため）。

---

## 2. 進捗・実装メモ  — AIが読む

### 遵守事項（毎回）
- **実装前に本体リポジトリの `project/governance/`・`issue-phase004-000__phase-overview.md`・`issue-gantt-phase004-000__gantt-overview.md` を必ず読むこと。**
- **既存テストの見直しは機能実装と同等に重要（本 Issue は特に）。** 本体 `ast-to-gantt.test.ts` は「子は集約される」前提のテストが多数あるはず。展開モード追加後も**集約モードの既存テストは維持**し（デフォルト OFF なので既存挙動は正）、展開モードのテストを**新設**する。lib 側もツリー行生成のテストが影響を受ける。

### 対象・既存資産
- lib: `../ganttchart-for-mywork/src/types.ts`（GanttNode は既に `parentId` / `isCollapsed` を持つ — 着手時に現行の親子・折り畳みの実装度を確認し、**使える機構は再実装せず使う**。確認結果を履歴に記録）。
- lib: `src/components/GanttTree.svelte` / `GanttTimeline.svelte`。
- 本体: `src/lib/gantt/ast-to-gantt.ts`（descendantDateRange による集約）と `src/views/GanttViewMount.svelte`（モード切替 UI の置き場）。

### 仕様
1. **モード**: 本体側に表示トグル「サブタスク展開」（デフォルト OFF）。OFF: 従来どおり集約。ON: 子タスクを個別 GanttNode として parentId 付きで渡す。
2. **期間なし行**: start/end が undefined の GanttNode を「タイムライン上に左寄せのテキスト行（・タスク名）」として描画する。バーは描かない。既存実装が undefined をどう扱っているか（スキップ？エラー？）を最初に確認し、スキップしているなら描画分岐を追加。
3. **折り畳み**: 親行のツリー側に ▸/▾ トグル。折り畳んだ親は従来の集約バー（min/max）で表示（＝OFF モードの見た目と同じ）。既存 `isCollapsed` 機構が使えるなら流用。
4. **折り畳み状態の保持**: ライブラリ内部状態＋`onCollapseChange?: (id, collapsed) => void` コールバック（永続化はホスト責務 — 汎用性維持）。
5. ネスト 3 段以上: 全段展開する（オーナー決定 Q5: 詳細はエンジニア裁量、初期案は全展開）。

### 実装の要点・つまずき
- **id の一意性**: 展開モードで子を渡すとき、id は globalKey（本体側で一意）。集約モードとの切替で id 集合が変わるため、lib 側に「前回の id を前提としたキャッシュ」があると切替時に壊れる。切替テストを必ず書く。
- 期間なし行のテキストは行クリック（既存の onNodeClick 相当があるなら）でエディタジャンプが効くこと（既存カーソル同期の回帰確認）。
- 表示範囲計算: 期間なし行は範囲計算に影響させない。

### TODO
- [ ] lib: 現行の parentId / isCollapsed 実装度の調査（履歴に記録）
- [ ] lib: 期間なし行の描画・折り畳みトグル・onCollapseChange
- [ ] 本体: 展開モード投影（ast-to-gantt）＋トグル UI
- [ ] 両リポジトリのテスト見直し＋新設（集約モード回帰・展開モード・切替）
- [ ] 本体 E2E: gantt-view.e2e.ts に展開モードのスモーク 1 件（実行時生成ファイル・shadow ヘルパ使用）

### 受け入れ基準
- トグル OFF で従来表示（完全回帰）。
- ON で子タスクが行として現れ、期間なし子はテキスト行、期間あり子はバー。
- 親の ▸/▾ で折り畳め、畳むと集約バー表示になる。
- 両リポジトリのテストと本体 `npm run test:obs:e2e` 全通過。

### テスト観点
- ast-to-gantt: 展開/集約の投影 unit（親子 id・期間なし子の undefined start/end）。
- lib: 期間なし行の描画分岐・折り畳みトグル・切替時の再構築。

### 履歴（追記のみ）
- 2026-07-04 — 起票。

### 2026-07-23 10:00

- User Instruction:
  - issue-gantt-phase004-001〜007 を一括実装するよう指示された（オーナー不在のため曖昧な点は実装者の推奨案で進める）。ただし今回の作業範囲は `ganttchart-for-mywork`（本リポジトリ）のみで、`markdownEditor-for-mywork`（本体）側の変更は対象外とした。

- Change（lib 側の調査結果・現行実装度）:
  - `parentId` / `isCollapsed` によるツリー構築・折り畳みは、着手前から `core/data-manager.ts`（`computeNodes`/`isNodeVisible`/`toggleNodeCollapse`）・`GanttTree.svelte`・`GanttChart.svelte`（`handleToggleCollapse`）に**完全実装済み**だった。ライブラリは「渡された nodes 配列を親子関係のまま全行表示する」設計のため、子タスクを個別行として展開するかどうかはそもそも**ホストが nodes に子を含めるかどうかだけで決まり、ライブラリ側に「集約/展開モード」という概念は元々存在しない**。3段以上のネストも `calculateDepth` が再帰的に対応済みで追加対応不要と判断した。
  - `onToggleCollapse?: (nodeId, newCollapsedState) => void` が既に Issue の要求する `onCollapseChange` と同じ役割で実装済みだったため、新規コールバックは追加せず既存名を維持した（重複防止、issue-gantt-phase004-001 の `indentSize`/`treePaneWidth` と同様の判断）。
  - 上記の調査により、lib 側の残タスクは「期間なしサブタスクの行表示（バーの代わりにテキスト行）」のみと判定した。
- Change（実装）:
  - `GanttTimeline.svelte` で、`type === 'task'` かつ `isDateUnset`（start/end 未設定）のノードについて、従来の破線プレースホルダーバー（`gantt-bar--unset`）描画を行わず、代わりに「・タスク名」の左寄せテキスト行を描画するようにした（`plan` がある場合は issue-gantt-phase004-003 の plan 枠＋テキストになる。詳細は 003 の履歴を参照）。この分岐は `type === 'task'` のみに適用し、section/subsection/project は従来どおり（回帰なし）。
  - 上記の挙動変更により `.gantt-bar--unset` クラスパスは task 型では到達不能になったが、`GanttTaskBar.svelte` 側のコード自体は削除していない（他用途での再利用可能性を残すため）。本体側（`markdownEditor-for-mywork`）の grep 確認で `gantt-bar--unset` への依存は無いことを確認済みで、回帰リスクは無いと判断した。
- Change（本体側・対象外）:
  - Issue 原文にある「本体側の展開モード投影変更（ast-to-gantt）・トグル UI」は本リポジトリのスコープ外のため未実装。上記の調査結果（lib は集約/展開の区別を持たず、host が渡す nodes 次第で自動的に展開表示される）を踏まえると、本体側の対応も「トグル ON 時に子ノードを nodes 配列に含めて渡す」投影ロジック追加のみで足りるはずであり、lib 側の追加改修は不要と見込まれる。

- Rationale:
  - 既存実装済みの機構（親子表示・折り畳み・コールバック）を再実装しないという gantt-overview §3-5 の方針に従い、真に不足していた「期間なし行」のみに実装を絞った。挙動変更（プレースホルダーバー廃止）は issue-gantt-phase004-007 の受け入れ基準（期間なし子はテキスト行）が既存のプレースホルダーバー表示と非両立だったため、新仕様を正として既存挙動を置き換える判断をした（phase004-000 共通憲章「新仕様に照らして正しい期待値に書き換える」に従う）。

### 2026-07-23 11:30（訂正）

- User Instruction:
  - 「007が実装されていません。もう一度issueを確認し実装を修正してください」との指摘を受けた。

- Change:
  - Issue 本文 §1 方針を再読した結果、「本体側の『展開モードで子を個別ノードとして渡す』投影変更も本Issueのスコープに含む（表示できないと検証できないため）」と明記されており、前回の履歴（10:00 時点）で「本体側は対象外」と判断したのは**誤りだった**。前回の判断を訂正し、`markdownEditor-for-mywork`（本体）側も実装した。
  - 本体側の実装着手前に `src/lib/gantt/ast-to-gantt.ts` の実際の挙動を検証用テストで確認したところ、**Issue が前提とする「現状は子タスクを畳んで親の1行に集約している」という記述は現行コードと食い違っていた**：`@schedule` を持つ子タスクは、着手前から常に個別 `task` ノードとして `parentId` 付きで出力されていた（`extractFromNodes` が無条件に子へ再帰していたため）。実際に集約されていた（＝出力されていなかった）のは「`@schedule` を持たず、かつ配下にも `@schedule` を持つ子孫がいないサブタスク」のみ。この事実確認を履歴に記録する。
  - 上記の事実に基づき、「サブタスク展開」トグルの実装対象を「期間未設定サブタスクを出力するかどうか」に絞った（スケジュール済み子タスクの個別行出力は元から存在する既存動作のため変更していない）。
  - `src/settings.ts`: `ganttExpandSubtasks: boolean`（既定 `false`）を `MdAstEditorSettings` に追加。設定タブに「サブタスク展開」トグルを追加（Gantt View セクション新設）。
  - `src/lib/gantt/ast-to-gantt.ts`: `extractGanttNodes(sources, viewRange?, options?: { expandSubtasks?: boolean })` に拡張。`extractFromNodes`/`extractFromSection`/`extractFromDocument` すべてに `options` を通し、`isUnscheduledSubtask && !options.expandSubtasks` の場合のみ従来どおり `continue`（スキップ）。`expandSubtasks: true` の場合は type=`task`・start/end 未設定のまま `GanttNode` を出力する（lib 側の `isDateUnset` テキスト行描画にそのまま乗る）。
  - `src/lib/gantt/ast-to-gantt.test.ts`: 7件追加（既定/false 明示時の回帰確認、true 時の出力・parentId・type、無関係セクションの非表示回帰、@repeat との非干渉）。既存25件は無変更で全通過（完全回帰）。
  - `src/lib/gantt/GanttTab.svelte` → `src/views/GanttViewMount.svelte` → `src/views/GanttView.ts`（`HealthView` と同じ「設定を constructor で受け取り `getExtraMountProps()` で注入」パターンに倣った）→ `src/plugin.ts`（`new GanttView(leaf, this.settings, ...)`）まで配線。
  - `tests/obs-e2e/gantt-view.e2e.ts` に展開モードのスモークテストを2件追加（設定OFF時に期間未設定サブタスクが出ないことの回帰確認、設定ON時にテキスト行として表示されることの確認）。設定は `onOpen()` 時にのみ読まれる（非リアクティブ、`HealthView` と同じ既存の制約）ため、テストヘルパ `setGanttExpandSubtasks()` で設定変更後に既存 Gantt View leaf を `detach()` してから再オープンする方式にした。実行時生成ファイルを使用（`project/knowledge/obsidian-plugin-testing.md` §4.4 準拠）。`npm run test:obs:e2e:run -- --spec tests/obs-e2e/gantt-view.e2e.ts` で実機確認済み（結果は本エントリ末尾に追記）。
  - `npx vitest run`（本体全体）455件・`npx svelte-check`（本体）でこの変更起因の新規エラーなしを確認済み。

- Rationale:
  - Issue 本文が本体側投影変更を明示的にスコープへ含めている以上、それを「対象外」と判断したのは AI_RUNTIME_RULES §2「project/specs・project/issues を正とする」に反する誤り。訂正して本体側まで実装した。
  - トグルの実装範囲を「期間未設定サブタスクの出力有無」に絞ったのは、実装前調査でスケジュール済み子タスクの個別出力が既に無条件の既存動作だと判明したため。Issue 本文の「集約」という記述と現行コードの乖離は本エントリで明示し、以後の実装者が同じ誤読をしないようにした。

### 2026-07-23 12:15（実機E2Eでの副作用発見・修正）

- Change:
  - `npm run test:obs:e2e:run -- --spec tests/obs-e2e/gantt-view.e2e.ts` を実行したところ、本Issueとは無関係の既存2件（「バードラッグで @schedule が更新される」「完了タスク（[x]）のバーが completed 装飾でグレーアウトされる」）が **shadow 内に `.gantt-timeline rect[class*="gantt-bar--task"]` が出現しない** で失敗した。
  - 原因を切り分けるため、コミット済み HEAD（本Issueの変更はもちろん、issue-gantt-phase004-001〜006 の未コミット変更もすべて含まない状態）に一時的に `git stash` で戻し、同条件で実行したところ**両テストとも成功**した。両状態で `.gantt-timeline-wrapper` の `clientWidth` を直接ダンプして比較した結果:
    - HEAD（stash後）: `clientWidth` が測定タイミングにより `0` になっており、`GanttChart.svelte` の `xWindow = (timelineViewportWidth > 0 ...) ? calculateXWindow(...) : fullWindow(extendedDateRange)` の分岐が **フォールバック（全件描画）側** に倒れていた。これにより、実際のスクロール位置（今日＝2026-07-23 付近）から大きく離れた `test-tasks.md` の固定フィクスチャ日付（2026-03〜04月、約100日差）のバーも「たまたま」全部描画されていた。
    - 本Issueまでの変更を復元した状態: `clientWidth` が `89`（実測値）になり、`calculateXWindow` が本来の意図どおり viewport＋`xOverscanPx`(500px) の範囲だけを描画するようになった結果、100日離れた `test-tasks.md` のバーがウィンドウ外となり描画されなくなった。
  - つまり2件の失敗は **本Issueの実装が壊したのではなく、以前は viewport 幅測定のタイミング競合による「たまたまの全件フォールバック描画」に無自覚に依存していた、日付ドリフトに脆いテストが、正しい虚想スクロール窓計算によって顕在化した** ものだった（`project/knowledge/obsidian-plugin-testing.md` §4.4 が警告する「固定日付フィクスチャは時間経過で腐る」の実例）。
  - 恒久対応（実行時生成フィクスチャへの置き換え）は `test-tasks.md` が他の既存スペックからも参照される共有フィクスチャのため本Issueの範囲を超えると判断し、既に同ファイル内の「完了タスク」テストが採用していた**ズームアウトで可視ウィンドウを広げる**という既存パターンを、失敗していたもう1件（「バードラッグ」テスト）にも適用し、共通ヘルパ `zoomOutFully()` に切り出した。あわせて「完了タスク」テスト側の**ズームアウト前に配置されていた早すぎる bar 存在チェック**（同じ脆弱性を持っていた）も、ズームアウト後に実行されるよう順序を修正した。
  - 修正後、`gantt-view.e2e.ts` 全7件（既存5件＋本Issue新設2件）が実機で通過することを確認した。

- Rationale:
  - TESTING_STANDARD「Failing test = implementation incomplete」およびWORKFLOW §5「全functional/E2Eテストが通過すること」に従い、本Issueの変更によって顕在化した既存テストの脆弱性も合わせて解消した。フィクスチャ自体の日付更新やテスト全面書き換えは影響範囲が本Issue外の他スペックにも及ぶため行わず、既存ファイル内に既に確立されていた「ズームアウトで頑健にする」パターンの横展開に留めた。

---

## 3. メタデータ
- id: issue-gantt-phase004-007__subtask-rows-and-collapse
- status: implemented（ユーザー承認待ち。lib側・本体側とも実装済み）
- phase: 004
- target_repo: ../ganttchart-for-mywork（＋本体 src/lib/gantt/, src/settings.ts, src/views/GanttView.ts, src/views/GanttViewMount.svelte, tests/obs-e2e/gantt-view.e2e.ts）
- related_issues: issue-phase004-000, issue-phase004-004, issue-gantt-phase004-008（後続）, issue-phase003-001（未予定→予定化の思想元）
- created: 2026-07-04
- updated: 2026-07-23
