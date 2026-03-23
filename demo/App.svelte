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

        nodes.push({
          id: `t${idCounter++}`,
          parentId: sectionId,
          type: 'task',
          name: `${taskTemplates[ti]}`,
          start: taskStart,
          end: taskEnd,
        });
      }
    }
  }
</script>

<main>
  <header>
    <h1>svelte-gantt-lib デモ</h1>
    <p class="hint">右クリックドラッグでパン / Ctrl+ホイールでズーム / バーをドラッグで移動</p>
  </header>

  <div class="chart-wrapper">
    <GanttChart {nodes} />
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
