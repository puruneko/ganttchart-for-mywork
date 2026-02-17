/**
 * ライフサイクルイベントシステム
 *
 * ガントチャートコンポーネントの描画完了タイミングを一元管理し、
 * ライブラリ外部から購読可能なイベントエミッター
 */

/**
 * ライフサイクルフェーズ
 */
export type LifecyclePhase = "initializing" | "rendering" | "mounted" | "ready"

/**
 * ライフサイクルイベント詳細情報
 */
export interface LifecycleEventDetail {
    phase: LifecyclePhase
    timestamp: number
    details?: Record<string, any>
}

/**
 * EventTarget を継承したライフサイクルイベントエミッター
 *
 * W3C 標準 API に準拠し、ブラウザネイティブなカスタムイベント機構を活用します。
 * フレームワーク非依存で、Vue/React/Angular など複数フレームワークに対応可能です。
 *
 * @example
 * ```typescript
 * const emitter = new LifecycleEventEmitter();
 *
 * // 特定フェーズのリッスン
 * emitter.on('ready', (event) => {
 *   console.log('Gantt is ready!', event.detail);
 * });
 *
 * // 1回限りのリッスン
 * emitter.once('mounted', (event) => {
 *   console.log('First mount:', event.detail);
 * });
 *
 * // イベント発行
 * emitter.emit('ready', { componentsLoaded: true });
 * ```
 */
export class LifecycleEventEmitter extends EventTarget {
    private eventQueue: LifecycleEventDetail[] = []
    private isDisposed = false

    /**
     * ライフサイクルイベントを発行する
     *
     * @param phase ライフサイクルフェーズ
     * @param details イベント詳細情報（オプション）
     */
    emit(phase: LifecyclePhase, details?: Record<string, any>): void {
        if (this.isDisposed) {
            console.warn("[LifecycleEventEmitter] 既に破棄されています")
            return
        }

        const eventDetail: LifecycleEventDetail = {
            phase,
            timestamp: Date.now(),
            details,
        }

        // イベント履歴を保持（デバッグ用）
        this.eventQueue.push(eventDetail)

        // グローバル'lifecycle'イベントを発行
        const lifecycleEvent = new CustomEvent("lifecycle", {
            detail: eventDetail,
            bubbles: true,
        })
        this.dispatchEvent(lifecycleEvent)

        // フェーズ固有の'lifecycle:${phase}'イベントを発行
        const phaseEvent = new CustomEvent(`lifecycle:${phase}`, {
            detail: eventDetail,
            bubbles: true,
        })
        this.dispatchEvent(phaseEvent)
    }

    /**
     * 特定フェーズのイベントリスナを登録する（複数回発火）
     *
     * @param phase ライフサイクルフェーズ
     * @param handler イベントハンドラー
     * @param options addEventListener のオプション
     * @returns リスナを削除する関数
     *
     * @example
     * ```typescript
     * const unsubscribe = emitter.on('ready', (event) => {
     *   console.log('Ready!');
     * });
     *
     * // リスナ削除
     * unsubscribe();
     * ```
     */
    on(
        phase: LifecyclePhase,
        handler: (event: CustomEvent<LifecycleEventDetail>) => void,
        options?: AddEventListenerOptions,
    ): () => void {
        this.addEventListener(
            `lifecycle:${phase}`,
            handler as EventListener,
            options,
        )

        // リスナ削除関数を返す
        return () =>
            this.removeEventListener(
                `lifecycle:${phase}`,
                handler as EventListener,
            )
    }

    /**
     * 特定フェーズのイベントを1回限りリッスンする
     *
     * @param phase ライフサイクルフェーズ
     * @param handler イベントハンドラー
     *
     * @example
     * ```typescript
     * emitter.once('mounted', (event) => {
     *   console.log('First mount detected');
     * });
     * ```
     */
    once(
        phase: LifecyclePhase,
        handler: (event: CustomEvent<LifecycleEventDetail>) => void,
    ): void {
        this.addEventListener(`lifecycle:${phase}`, handler as EventListener, {
            once: true,
        })
    }

    /**
     * すべてのライフサイクルイベントをリッスンする
     *
     * @param handler イベントハンドラー
     * @param options addEventListener のオプション
     * @returns リスナを削除する関数
     *
     * @example
     * ```typescript
     * emitter.onLifecycle((event) => {
     *   console.log(`[${event.detail.phase}]`, event.detail.details);
     * });
     * ```
     */
    onLifecycle(
        handler: (event: CustomEvent<LifecycleEventDetail>) => void,
        options?: AddEventListenerOptions,
    ): () => void {
        this.addEventListener("lifecycle", handler as EventListener, options)

        // リスナ削除関数を返す
        return () =>
            this.removeEventListener("lifecycle", handler as EventListener)
    }

    /**
     * 特定フェーズのリスナを削除する
     *
     * @param phase ライフサイクルフェーズ
     * @param handler 削除するハンドラー
     */
    off(
        phase: LifecyclePhase,
        handler: (event: CustomEvent<LifecycleEventDetail>) => void,
    ): void {
        this.removeEventListener(`lifecycle:${phase}`, handler as EventListener)
    }

    /**
     * イベント履歴を取得する（デバッグ用）
     *
     * @returns 発火したイベントの履歴
     *
     * @example
     * ```typescript
     * const history = emitter.getEventHistory();
     * console.log('イベント履歴:', history);
     * ```
     */
    getEventHistory(): LifecycleEventDetail[] {
        return [...this.eventQueue]
    }

    /**
     * リソースをクリーンアップする
     *
     * インスタンスの使用を終了する際に呼び出してください。
     * 呼び出し後のイベント emit は無視されます。
     *
     * @example
     * ```typescript
     * emitter.dispose();
     * ```
     */
    dispose(): void {
        this.isDisposed = true
        this.eventQueue = []
    }
}

/**
 * ライフサイクルイベントエミッターを作成する
 *
 * @returns LifecycleEventEmitter インスタンス
 */
export function createLifecycleEventEmitter(): LifecycleEventEmitter {
    return new LifecycleEventEmitter()
}
