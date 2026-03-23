/**
 * スクロール同期ユーティリティ
 *
 * ヘッダー・タイムライン・ツリーの3ペイン間のスクロールを同期する
 * ハンドラーを生成するファクトリー関数。
 */

export interface ScrollSyncElements {
    timelineWrapper: HTMLElement | null
    headerWrapper: HTMLElement | null
    treeWrapper: HTMLElement | null
}

/**
 * スクロール同期ハンドラーを生成する
 *
 * @param getElements - 現在のDOM要素を返すゲッター関数
 * @param onTimelineScrollX - タイムライン横スクロール時のコールバック（scrollLeft, containerWidth）
 */
export function createScrollSyncHandlers(
    getElements: () => ScrollSyncElements,
    onTimelineScrollX?: (scrollLeft: number, containerWidth: number) => void,
) {
    let isScrolling = false

    function handleTimelineScroll() {
        if (isScrolling) return
        isScrolling = true
        try {
            const { timelineWrapper, headerWrapper, treeWrapper } = getElements()

            // 横スクロール: ヘッダーと同期
            if (timelineWrapper && headerWrapper) {
                const scrollLeft = timelineWrapper.scrollLeft
                if (headerWrapper.scrollLeft !== scrollLeft) {
                    headerWrapper.scrollLeft = scrollLeft
                }
                // 端スクロール検知コールバック（日付範囲拡張など）
                if (onTimelineScrollX) {
                    onTimelineScrollX(scrollLeft, timelineWrapper.clientWidth)
                }
                // コールバック後に拡張でスクロール位置が変わった可能性があるため再同期
                if (headerWrapper.scrollLeft !== timelineWrapper.scrollLeft) {
                    headerWrapper.scrollLeft = timelineWrapper.scrollLeft
                }
            }

            // 縦スクロール: ツリーと同期
            if (timelineWrapper && treeWrapper) {
                const scrollTop = timelineWrapper.scrollTop
                if (treeWrapper.scrollTop !== scrollTop) {
                    treeWrapper.scrollTop = scrollTop
                }
            }
        } finally {
            setTimeout(() => {
                isScrolling = false
            }, 0)
        }
    }

    function handleTreeScroll() {
        if (isScrolling) return
        isScrolling = true
        try {
            const { timelineWrapper, treeWrapper } = getElements()
            if (timelineWrapper && treeWrapper) {
                const scrollTop = treeWrapper.scrollTop
                if (timelineWrapper.scrollTop !== scrollTop) {
                    timelineWrapper.scrollTop = scrollTop
                }
            }
        } finally {
            setTimeout(() => {
                isScrolling = false
            }, 0)
        }
    }

    function handleHeaderScroll() {
        if (isScrolling) return
        isScrolling = true
        try {
            const { timelineWrapper, headerWrapper } = getElements()
            if (timelineWrapper && headerWrapper) {
                const scrollLeft = headerWrapper.scrollLeft
                if (timelineWrapper.scrollLeft !== scrollLeft) {
                    timelineWrapper.scrollLeft = scrollLeft
                }
            }
        } finally {
            setTimeout(() => {
                isScrolling = false
            }, 0)
        }
    }

    /**
     * スクロール同期を一時的に抑制して操作を実行する
     * 右クリックドラッグなど、直接スクロール位置を操作する場合に使用
     */
    function suppressSync(fn: () => void): void {
        isScrolling = true
        fn()
        isScrolling = false
    }

    return {
        handleTimelineScroll,
        handleTreeScroll,
        handleHeaderScroll,
        suppressSync,
    }
}
