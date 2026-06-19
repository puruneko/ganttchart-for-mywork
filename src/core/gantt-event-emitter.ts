/**
 * ガントチャート ユーザーインタラクションイベントシステム
 *
 * handlers props（コールバック）と並行して利用できる EventTarget ベースのイベントバス。
 * addEventListener スタイルで複数のリスナーを動的に登録できる。
 *
 * @example
 * ```typescript
 * const store = chart.getStore();
 *
 * // 個別イベントをリッスン
 * store.events.on('barClick', (e) => {
 *   console.log('clicked:', e.detail.node);
 * });
 *
 * // 全イベントをまとめてリッスン
 * store.events.onAny((e) => {
 *   console.log('gantt event:', e.detail);
 * });
 *
 * // 購読解除
 * const unsub = store.events.on('panStart', handler);
 * unsub();
 * ```
 */

import type { GanttUserEventType, GanttUserEventDetailMap } from '../types'

export class GanttEventEmitter extends EventTarget {
    private isDisposed = false

    /**
     * イベントを発行する。"gantt"（全）と "gantt:{type}"（個別）の2系統を発火。
     */
    emit<T extends GanttUserEventType>(type: T, detail: GanttUserEventDetailMap[T]): void {
        if (this.isDisposed) return
        this.dispatchEvent(new CustomEvent('gantt', { detail: { type, ...detail } }))
        this.dispatchEvent(new CustomEvent(`gantt:${type}`, { detail }))
    }

    /**
     * 特定イベントのリスナーを登録する（複数回発火）
     * @returns リスナーを削除する関数
     */
    on<T extends GanttUserEventType>(
        type: T,
        handler: (event: CustomEvent<GanttUserEventDetailMap[T]>) => void,
        options?: AddEventListenerOptions,
    ): () => void {
        this.addEventListener(`gantt:${type}`, handler as EventListener, options)
        return () => this.removeEventListener(`gantt:${type}`, handler as EventListener)
    }

    /**
     * 特定イベントを1回だけリッスンする
     */
    once<T extends GanttUserEventType>(
        type: T,
        handler: (event: CustomEvent<GanttUserEventDetailMap[T]>) => void,
    ): void {
        this.addEventListener(`gantt:${type}`, handler as EventListener, { once: true })
    }

    /**
     * 全イベントをまとめてリッスンする
     * @returns リスナーを削除する関数
     */
    onAny(
        handler: (event: CustomEvent<{ type: GanttUserEventType } & Record<string, unknown>>) => void,
        options?: AddEventListenerOptions,
    ): () => void {
        this.addEventListener('gantt', handler as EventListener, options)
        return () => this.removeEventListener('gantt', handler as EventListener)
    }

    /**
     * 特定イベントのリスナーを削除する
     */
    off<T extends GanttUserEventType>(
        type: T,
        handler: (event: CustomEvent<GanttUserEventDetailMap[T]>) => void,
    ): void {
        this.removeEventListener(`gantt:${type}`, handler as EventListener)
    }

    /**
     * リソースをクリーンアップする。呼び出し後の emit は無視される。
     */
    dispose(): void {
        this.isDisposed = true
    }
}

export function createGanttEventEmitter(): GanttEventEmitter {
    return new GanttEventEmitter()
}
