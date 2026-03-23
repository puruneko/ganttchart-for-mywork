/**
 * 2段構成のタイムラインヘッダー用tick生成システム
 *
 * 上段（majorTicks）: 大きい単位（年、月、週など）
 * 下段（minorTicks）: 小さい単位（日、時間など）
 */

import { DateTime, Duration } from "luxon"
import type { DateRange } from "../types"
import type { TickDefinition } from "./zoom-scale"

/**
 * Tick情報（単一のtick）
 */
export interface Tick {
    /** Tickの開始日時 */
    start: DateTime
    /** Tickの終了日時（次のtickの開始位置） */
    end: DateTime
    /** 表示ラベル */
    label: string
}

/**
 * 2段Tick構成
 */
export interface TwoLevelTicks {
    /** 上段（大単位） */
    majorTicks: Tick[]
    /** 下段（小単位） */
    minorTicks: Tick[]
}

/**
 * 日付範囲内のtickを生成（単一レベル）
 */
function generateTicks(
    dateRange: DateRange,
    unit: "year" | "month" | "week" | "day" | "hour",
    format: string,
    interval?: Duration,
): Tick[] {
    const ticks: Tick[] = []
    let current = dateRange.start.startOf(unit as any)

    // 開始日より前の場合は、次の単位まで進める
    if (current < dateRange.start) {
        if (interval) {
            current = current.plus(interval)
        } else {
            current = current.plus({ [unit + "s"]: 1 })
        }
    }

    while (current <= dateRange.end) {
        let next: DateTime
        if (interval) {
            next = current.plus(interval)
        } else {
            next = current.plus({ [unit + "s"]: 1 })
        }

        ticks.push({
            start: current,
            end: next,
            label: current.toFormat(format),
        })

        current = next
    }

    return ticks
}

/**
 * 2段構成のtickを生成
 *
 * @param dateRange - タイムラインの日付範囲
 * @param def - TickDefinition（zoom-scale.tsで定義）
 */
export function generateTwoLevelTicks(
    dateRange: DateRange,
    def: TickDefinition,
): TwoLevelTicks {
    const majorTicks = generateTicks(
        dateRange,
        def.majorUnit,
        def.majorFormat,
        def.majorInterval,
    )
    const minorTicks = generateTicks(
        dateRange,
        def.minorUnit,
        def.minorFormat,
        def.minorInterval,
    )

    return {
        majorTicks,
        minorTicks,
    }
}
