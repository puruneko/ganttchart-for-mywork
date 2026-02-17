/**
 * レンダリングライフサイクル管理
 * 
 * Ganttチャート全体の描画フェーズを管理し、
 * 各コンポーネントが適切なタイミングで動作できるようにする。
 */

import { writable, derived } from 'svelte/store';
import type { Readable } from 'svelte/store';

/**
 * レンダリングフェーズの定義
 */
export type RenderPhase = 
  | 'initializing'    // ストア作成中、データ準備中
  | 'mounting'        // DOM要素がマウント中
  | 'measuring'       // 要素サイズ測定中
  | 'rendering'       // 初期レンダリング中
  | 'ready'           // 初期描画完了、ユーザ操作可能
  | 'updating';       // データ更新によるリレンダリング中

/**
 * レンダリングライフサイクル管理ストア
 */
export function createRenderLifecycle() {
  const phase = writable<RenderPhase>('initializing');
  
  // 読み取り専用の派生状態
  const isInitializing: Readable<boolean> = derived(phase, $p => $p === 'initializing');
  const isReady: Readable<boolean> = derived(phase, $p => $p === 'ready');
  const canInteract: Readable<boolean> = derived(phase, $p => $p === 'ready' || $p === 'updating');
  
  return {
    // 読み取り専用ストア
    phase: { subscribe: phase.subscribe } as Readable<RenderPhase>,
    isInitializing,
    isReady,
    canInteract,
    
    // フェーズ遷移関数
    setPhase: (newPhase: RenderPhase) => {
      phase.set(newPhase);
    },
    
    // 便利メソッド
    startMounting: () => phase.set('mounting'),
    startMeasuring: () => phase.set('measuring'),
    startRendering: () => phase.set('rendering'),
    markReady: () => phase.set('ready'),
    startUpdating: () => phase.set('updating'),
    finishUpdating: () => phase.set('ready'),
  };
}

/**
 * ライフサイクル管理ストアの型定義
 */
export type RenderLifecycle = ReturnType<typeof createRenderLifecycle>;
