<script lang="ts">
  import { GanttChart } from '../src/index';
  import type { GanttNode } from '../src/index';
  import { DateTime } from 'luxon';

  const today = DateTime.now().startOf('day');

  // 5 プロジェクト × 4 セクション × 5 タスク = 計 5+20+100 = 125 行
  const projectDefs = [
    { name: 'Webサイトリニューアル', offsetDays: -10, durationDays: 90 },
    { name: 'モバイルアプリ開発',    offsetDays: 10,  durationDays: 120 },
    { name: '社内基幹システム刷新',  offsetDays: 30,  durationDays: 180 },
    { name: 'データ分析基盤構築',    offsetDays: 5,   durationDays: 60 },
    { name: 'セキュリティ強化対応',  offsetDays: -5,  durationDays: 45 },
  ];

  const sectionNames = [
    '要件定義・設計',
    '開発フェーズ',
    'テスト・QA',
    'リリース・運用',
  ];

  const taskTemplates = [
    '要件ヒアリング',
    '仕様書作成',
    'プロトタイプ',
    '実装',
    'レビュー・修正',
  ];

  const nodes: GanttNode[] = [];
  let idCounter = 1;

  // --- issue-gantt-phase004 の可視化デモ用データ（先頭に配置し、スクロールなしで確認できるようにする） ---
  const demoProjectId = 'phase004-demo';
  nodes.push({
    id: demoProjectId,
    parentId: null,
    type: 'project',
    name: 'phase004 機能デモ',
    start: today.minus({ days: 5 }),
    end: today.plus({ days: 40 }),
  });

  nodes.push(
    {
      id: 'phase004-plan-schedule',
      parentId: demoProjectId,
      type: 'task',
      name: 'plan枠＋schedule',
      start: today.plus({ days: 3 }),
      end: today.plus({ days: 8 }),
      plan: { start: today, end: today.plus({ days: 12 }) },
      status: 'doing',
      trailingLabels: ['Doing', 'P1'],
    },
    {
      id: 'phase004-plan-only',
      parentId: demoProjectId,
      type: 'task',
      name: 'planのみ（日時未定）',
      plan: { start: today.plus({ days: 2 }), end: today.plus({ days: 15 }) },
    },
    {
      id: 'phase004-unset',
      parentId: demoProjectId,
      type: 'task',
      name: '期間なしサブタスク',
    },
    {
      id: 'phase004-due-point',
      parentId: demoProjectId,
      type: 'task',
      name: '一点due',
      start: today.plus({ days: 5 }),
      end: today.plus({ days: 10 }),
      milestone: today.plus({ days: 14 }),
    },
    {
      id: 'phase004-due-range',
      parentId: demoProjectId,
      type: 'task',
      name: '期間due',
      start: today.plus({ days: 1 }),
      end: today.plus({ days: 6 }),
      milestone: { start: today.plus({ days: 18 }), end: today.plus({ days: 22 }) },
    },
    {
      id: 'phase004-tentative',
      parentId: demoProjectId,
      type: 'task',
      name: '仮置き（?）',
      start: today.plus({ days: 20 }),
      end: today.plus({ days: 25 }),
      tentative: true,
      trailingLabels: ['仮'],
    },
    {
      id: 'phase004-done',
      parentId: demoProjectId,
      type: 'task',
      name: '完了（status=done）',
      start: today.minus({ days: 3 }),
      end: today.plus({ days: 1 }),
      status: 'done',
    },
  );

  // 祝日サンプル（今日から10日後を祝日として色分け確認用）
  const demoHolidays = [today.plus({ days: 10 }).toISODate()!];

  for (let pi = 0; pi < projectDefs.length; pi++) {
    const pd = projectDefs[pi];
    const projectId = `p${pi}`;
    const projectStart = today.plus({ days: pd.offsetDays });
    const projectEnd = projectStart.plus({ days: pd.durationDays });

    nodes.push({
      id: projectId,
      parentId: null,
      type: 'project',
      name: pd.name,
      start: projectStart,
      end: projectEnd,
    });

    const sectionDuration = Math.floor(pd.durationDays / sectionNames.length);

    for (let si = 0; si < sectionNames.length; si++) {
      const sectionId = `p${pi}s${si}`;
      const sectionStart = projectStart.plus({ days: si * sectionDuration });
      const sectionEnd = sectionStart.plus({ days: sectionDuration });

      nodes.push({
        id: sectionId,
        parentId: projectId,
        type: 'section',
        name: sectionNames[si],
        start: sectionStart,
        end: sectionEnd,
      });

      const taskDuration = Math.max(1, Math.floor(sectionDuration / taskTemplates.length));

      for (let ti = 0; ti < taskTemplates.length; ti++) {
        const taskStart = sectionStart.plus({ days: ti * taskDuration });
        const taskEnd = taskStart.plus({ days: taskDuration });

        const taskId = `t${idCounter++}`;
        nodes.push({
          id: taskId,
          parentId: sectionId,
          type: 'task',
          name: `${taskTemplates[ti]}`,
          start: taskStart,
          end: taskEnd,
          completed: si === 0 && ti < 2,
        });

        // 主要なタスク（実装など）にサブタスクを追加
        if ((ti === 3 || ti === 4) && pi < 3) {
          const subtaskDuration = Math.max(1, Math.floor((taskEnd.diff(taskStart, 'days').days) / 3));
          const subtaskTemplates = ['基本実装', 'エッジケース対応', 'レビュー反映'];

          for (let sti = 0; sti < subtaskTemplates.length; sti++) {
            const subtaskStart = taskStart.plus({ days: sti * subtaskDuration });
            const subtaskEnd = subtaskStart.plus({ days: subtaskDuration - 0.5 });

            nodes.push({
              id: `t${idCounter++}`,
              parentId: taskId,
              type: 'task',
              name: subtaskTemplates[sti],
              start: subtaskStart,
              end: subtaskEnd,
            });
          }
        }
      }
    }
  }

  // --- 追加シナリオ1: 並列タスク + 依存関係パターン ---
  const parallelProjectId = `parallel-project`;
  nodes.push({
    id: parallelProjectId,
    parentId: null,
    type: 'project',
    name: '[サンプル] 並列タスク＆依存関係',
    start: today.plus({ days: 50 }),
    end: today.plus({ days: 95 }),
  });

  const parallelSectionId = `parallel-section`;
  nodes.push({
    id: parallelSectionId,
    parentId: parallelProjectId,
    type: 'section',
    name: 'チーム並列作業',
    start: today.plus({ days: 50 }),
    end: today.plus({ days: 95 }),
  });

  // 並列タスクグループ
  const parallelTaskId1 = `parallel-task-1`;
  nodes.push({
    id: parallelTaskId1,
    parentId: parallelSectionId,
    type: 'task',
    name: 'フロントエンド開発',
    start: today.plus({ days: 50 }),
    end: today.plus({ days: 70 }),
    status: 'doing',
    trailingLabels: ['Doing'],
  });

  // フロントエンドのサブタスク
  for (const [idx, subtaskName] of ['UI設計', 'コンポーネント実装', 'スタイリング', '動作確認'].entries()) {
    nodes.push({
      id: `parallel-task-1-sub-${idx}`,
      parentId: parallelTaskId1,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 50 + idx * 5 }),
      end: today.plus({ days: 55 + idx * 5 }),
      completed: idx === 0,
    });
  }

  const parallelTaskId2 = `parallel-task-2`;
  nodes.push({
    id: parallelTaskId2,
    parentId: parallelSectionId,
    type: 'task',
    name: 'バックエンド開発',
    start: today.plus({ days: 50 }),
    end: today.plus({ days: 75 }),
    status: 'doing',
    trailingLabels: ['Doing'],
  });

  // バックエンドのサブタスク
  for (const [idx, subtaskName] of ['API設計', 'DB設計', '認証機能', 'ビジネスロジック実装'].entries()) {
    nodes.push({
      id: `parallel-task-2-sub-${idx}`,
      parentId: parallelTaskId2,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 50 + idx * 6 }),
      end: today.plus({ days: 55 + idx * 6 }),
      completed: idx === 0,
    });
  }

  const parallelTaskId3 = `parallel-task-3`;
  nodes.push({
    id: parallelTaskId3,
    parentId: parallelSectionId,
    type: 'task',
    name: '統合テスト',
    start: today.plus({ days: 75 }),
    end: today.plus({ days: 88 }),
    status: 'todo',
    trailingLabels: ['Pending'],
  });

  // 統合テストのサブタスク
  for (const [idx, subtaskName] of ['機能テスト', '非機能テスト', 'リグレッション', 'バグ修正'].entries()) {
    nodes.push({
      id: `parallel-task-3-sub-${idx}`,
      parentId: parallelTaskId3,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 75 + idx * 3 }),
      end: today.plus({ days: 77 + idx * 3 }),
    });
  }

  // --- 追加シナリオ2: リスク表現（遅延・ブロック中） ---
  const riskProjectId = `risk-project`;
  nodes.push({
    id: riskProjectId,
    parentId: null,
    type: 'project',
    name: '[サンプル] リスク・遅延シナリオ',
    start: today.plus({ days: 100 }),
    end: today.plus({ days: 160 }),
  });

  const riskSectionId = `risk-section`;
  nodes.push({
    id: riskSectionId,
    parentId: riskProjectId,
    type: 'section',
    name: 'リスク管理デモ',
    start: today.plus({ days: 100 }),
    end: today.plus({ days: 160 }),
  });

  // 予定通り進行中のタスク
  nodes.push({
    id: `risk-task-1`,
    parentId: riskSectionId,
    type: 'task',
    name: 'オンスケジュール (原来計画)',
    start: today.plus({ days: 100 }),
    end: today.plus({ days: 115 }),
    status: 'done',
  });

  nodes.push({
    id: `risk-task-1-plan`,
    parentId: riskSectionId,
    type: 'task',
    name: 'オンスケジュール (現在計画)',
    start: today.plus({ days: 100 }),
    end: today.plus({ days: 115 }),
    plan: { start: today.plus({ days: 100 }), end: today.plus({ days: 115 }) },
    status: 'done',
  });

  // 遅延タスク（予定超過）
  nodes.push({
    id: `risk-task-2`,
    parentId: riskSectionId,
    type: 'task',
    name: '遅延リスク (実績)',
    start: today.plus({ days: 115 }),
    end: today.plus({ days: 135 }),
    status: 'doing',
    trailingLabels: ['遅延', '警告'],
  });

  nodes.push({
    id: `risk-task-2-plan`,
    parentId: riskSectionId,
    type: 'task',
    name: '遅延リスク (予定)',
    plan: { start: today.plus({ days: 115 }), end: today.plus({ days: 125 }) },
    status: 'doing',
    trailingLabels: ['オーバー'],
  });

  // 完全に遅延したタスク
  nodes.push({
    id: `risk-task-3`,
    parentId: riskSectionId,
    type: 'task',
    name: 'ブロック中のタスク',
    plan: { start: today.plus({ days: 130 }), end: today.plus({ days: 145 }) },
    status: 'todo',
    tentative: true,
    trailingLabels: ['ブロック中', '要リソース'],
  });

  // --- 追加シナリオ3: 多階層・複雑な構造 ---
  const deepProjectId = `deep-project`;
  nodes.push({
    id: deepProjectId,
    parentId: null,
    type: 'project',
    name: '[サンプル] 深い階層構造',
    start: today.plus({ days: 170 }),
    end: today.plus({ days: 240 }),
  });

  const deepPhase1Id = `deep-phase-1`;
  nodes.push({
    id: deepPhase1Id,
    parentId: deepProjectId,
    type: 'section',
    name: 'フェーズ1: 準備',
    start: today.plus({ days: 170 }),
    end: today.plus({ days: 185 }),
  });

  const deepPhase1Task1Id = `deep-phase-1-task-1`;
  nodes.push({
    id: deepPhase1Task1Id,
    parentId: deepPhase1Id,
    type: 'task',
    name: 'リソース確保',
    start: today.plus({ days: 170 }),
    end: today.plus({ days: 177 }),
  });

  // 3階層目のサブタスク
  for (const [idx, subtaskName] of ['チームメンバー選定', 'ツール環境構築', '予算承認'].entries()) {
    nodes.push({
      id: `deep-phase-1-task-1-sub-${idx}`,
      parentId: deepPhase1Task1Id,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 170 + idx * 2 }),
      end: today.plus({ days: 172 + idx * 2 }),
    });
  }

  const deepPhase1Task2Id = `deep-phase-1-task-2`;
  nodes.push({
    id: deepPhase1Task2Id,
    parentId: deepPhase1Id,
    type: 'task',
    name: 'ドキュメント整備',
    start: today.plus({ days: 177 }),
    end: today.plus({ days: 185 }),
  });

  // 3階層目のサブタスク
  for (const [idx, subtaskName] of ['要件書作成', 'アーキテクチャ図', '実装ガイドライン'].entries()) {
    nodes.push({
      id: `deep-phase-1-task-2-sub-${idx}`,
      parentId: deepPhase1Task2Id,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 177 + idx * 2.5 }),
      end: today.plus({ days: 180 + idx * 2.5 }),
    });
  }

  const deepPhase2Id = `deep-phase-2`;
  nodes.push({
    id: deepPhase2Id,
    parentId: deepProjectId,
    type: 'section',
    name: 'フェーズ2: 実装',
    start: today.plus({ days: 185 }),
    end: today.plus({ days: 225 }),
  });

  const deepPhase2Task1Id = `deep-phase-2-task-1`;
  nodes.push({
    id: deepPhase2Task1Id,
    parentId: deepPhase2Id,
    type: 'task',
    name: 'コア機能開発',
    start: today.plus({ days: 185 }),
    end: today.plus({ days: 210 }),
  });

  // コア機能の複数サブタスク
  for (const [idx, subtaskName] of ['認証機構', 'データモデル', 'API層', 'ビジネスロジック'].entries()) {
    const subTaskId = `deep-phase-2-task-1-sub-${idx}`;
    nodes.push({
      id: subTaskId,
      parentId: deepPhase2Task1Id,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 185 + idx * 5 }),
      end: today.plus({ days: 192 + idx * 5 }),
    });

    // さらに深い4階層目のサブタスク（最初のコア機能にのみ）
    if (idx === 0) {
      for (const [sidx, ssubtaskName] of ['仕様確定', '実装', 'テスト'].entries()) {
        nodes.push({
          id: `deep-phase-2-task-1-sub-${idx}-sub-${sidx}`,
          parentId: subTaskId,
          type: 'task',
          name: ssubtaskName,
          start: today.plus({ days: 185 + sidx * 2 }),
          end: today.plus({ days: 187 + sidx * 2 }),
        });
      }
    }
  }

  const deepPhase2Task2Id = `deep-phase-2-task-2`;
  nodes.push({
    id: deepPhase2Task2Id,
    parentId: deepPhase2Id,
    type: 'task',
    name: 'オプション機能',
    start: today.plus({ days: 210 }),
    end: today.plus({ days: 225 }),
    status: 'todo',
    trailingLabels: ['後回し可能'],
  });

  for (const [idx, subtaskName] of ['機能A', '機能B', '機能C'].entries()) {
    nodes.push({
      id: `deep-phase-2-task-2-sub-${idx}`,
      parentId: deepPhase2Task2Id,
      type: 'task',
      name: subtaskName,
      start: today.plus({ days: 210 + idx * 5 }),
      end: today.plus({ days: 214 + idx * 5 }),
      status: idx === 0 ? 'doing' : 'todo',
    });
  }

  const deepPhase3Id = `deep-phase-3`;
  nodes.push({
    id: deepPhase3Id,
    parentId: deepProjectId,
    type: 'section',
    name: 'フェーズ3: 検証・リリース',
    start: today.plus({ days: 225 }),
    end: today.plus({ days: 240 }),
  });

  nodes.push({
    id: `deep-phase-3-task-1`,
    parentId: deepPhase3Id,
    type: 'task',
    name: 'QAテスト',
    start: today.plus({ days: 225 }),
    end: today.plus({ days: 235 }),
  });

  nodes.push({
    id: `deep-phase-3-task-2`,
    parentId: deepPhase3Id,
    type: 'task',
    name: 'リリース準備',
    start: today.plus({ days: 235 }),
    end: today.plus({ days: 240 }),
    milestone: today.plus({ days: 240 }),
  });
</script>

<main>
  <header>
    <h1>svelte-gantt-lib デモ</h1>
    <p class="hint">右クリックドラッグでパン / Ctrl+ホイールでズーム / バーをドラッグで移動</p>
  </header>

  <div class="chart-wrapper">
    <GanttChart {nodes} config={{ holidays: demoHolidays }} />
  </div>
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5;
    color: #333;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 16px;
    gap: 12px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 24px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: #999;
  }

  .chart-wrapper {
    flex: 1;
    min-height: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
</style>
