<script lang="ts">
  /**
   * デバッグパネルコンポーネント
   * ガントデータをツリー形式で表示
   */
  
  import type { GanttNode } from '../types';
  
  export let nodes: GanttNode[];
  export let classPrefix: string = 'gantt';
  
  interface TreeNode {
    node: GanttNode;
    children: TreeNode[];
  }
  
  // ノードをツリー構造に変換
  function buildTree(nodes: GanttNode[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    // 初期化
    nodes.forEach(node => {
      nodeMap.set(node.id, { node, children: [] });
    });
    
    // 親子関係を構築
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!;
      if (node.parentId === null) {
        roots.push(treeNode);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(treeNode);
        }
      }
    });
    
    return roots;
  }
  
  $: tree = buildTree(nodes);
  
  function renderTreeNode(treeNode: TreeNode, depth: number): string {
    const indent = '  '.repeat(depth);
    const icon = treeNode.children.length > 0 ? '📁' : '📄';
    let result = `${indent}${icon} ${treeNode.node.name} [${treeNode.node.type}]\n`;
    
    // 日時が設定されている場合のみ表示
    if (treeNode.node.start && treeNode.node.end) {
      result += `${indent}   ID: ${treeNode.node.id} | ${treeNode.node.start.toFormat('yyyy-MM-dd')} → ${treeNode.node.end.toFormat('yyyy-MM-dd')}`;
    } else {
      result += `${indent}   ID: ${treeNode.node.id} | 日時未設定`;
    }
    
    if (treeNode.node.isCollapsed) {
      result += ' | COLLAPSED';
    }
    result += '\n';
    
    treeNode.children.forEach(child => {
      result += renderTreeNode(child, depth + 1);
    });
    
    return result;
  }
</script>

<div class="{classPrefix}-debug-panel">
  <div class="{classPrefix}-debug-header">
    <h3>🔍 Debug: Gantt Data ({nodes.length} nodes)</h3>
  </div>
  <div class="{classPrefix}-debug-content">
    {#each tree as treeNode}
      <div class="{classPrefix}-debug-tree-root">
        {@html renderTreeNode(treeNode, 0).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}
      </div>
    {/each}
  </div>
</div>

<style>
  :global(.gantt-debug-panel) {
    border: 2px solid #ff6b6b;
    border-radius: 8px;
    background: #fff;
    margin-top: 20px;
    overflow: hidden;
  }
  
  :global(.gantt-debug-header) {
    background: #ff6b6b;
    color: white;
    padding: 12px 16px;
  }
  
  :global(.gantt-debug-header h3) {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  :global(.gantt-debug-content) {
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }
  
  :global(.gantt-debug-tree-root) {
    margin-bottom: 12px;
  }
</style>
