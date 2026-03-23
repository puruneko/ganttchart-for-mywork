<script lang="ts">
  /**
   * グループ背景コンポーネント
   *
   * セクション/サブセクションの配下タスクを囲む背景矩形を描画する。
   */

  import type { ComputedGanttNode } from '../types';
  import type { DragMode } from '../utils/drag-handler';

  export let node: ComputedGanttNode;
  export let visibleNodes: ComputedGanttNode[];
  export let x: number;
  export let barWidth: number;
  export let rowHeight: number;
  export let y: number;
  export let classPrefix: string;
  export let onMouseDown: (node: ComputedGanttNode, mode: DragMode, event: MouseEvent) => void;

  $: childNodes = visibleNodes.filter(n => {
    let current: ComputedGanttNode | undefined = n;
    while (current && current.parentId) {
      if (current.parentId === node.id) return true;
      current = visibleNodes.find(p => p.id === current!.parentId);
    }
    return false;
  });

  $: show = (node.type === 'section' || node.type === 'subsection') &&
             node.childrenIds.length > 0 &&
             childNodes.length > 0;

  $: lastChild = childNodes[childNodes.length - 1];
  $: sectionBarHeight = 20;
  $: groupY = y + (rowHeight - sectionBarHeight) / 2;
  $: groupHeight = show && lastChild
    ? (lastChild.visualIndex - node.visualIndex + 1) * rowHeight - (rowHeight - sectionBarHeight) / 2
    : 0;
</script>

{#if show}
  <rect
    {x}
    y={groupY}
    width={barWidth}
    height={groupHeight}
    class="{classPrefix}-group-bg {classPrefix}-group-bg--{node.type}"
    rx="6"
    on:mousedown={(e) => onMouseDown(node, 'group-move', e)}
    style="cursor: move;"
  />
{/if}
