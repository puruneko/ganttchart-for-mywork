/**
 * ズームスケールとtick定義のマッピング
 *
 * markwhenのtimeline実装を参考に、連続的なズーム値から
 * tick間隔を計算するシステムを実装。
 *
 * 設計思想:
 * - ズーム値は連続的な数値（scale factor）として扱う
 * - tick間隔は、ズーム値に応じて適切な単位（年、月、週、日、時間）を選択
 * - スケールの変化は滑らかで、視覚的なジャンプを避ける
 */

import { Duration } from "luxon"

/**
 * Tick定義（2段構成対応）
 * 特定のズーム範囲に対応する時間単位とフォーマット
 *
 * 上段（major）: 大きい単位（年、月、週など）
 * 下段（minor）: 小さい単位（日、時間など）
 */
export interface TickDefinition {
    /** この定義が適用される最小スケール値 */
    minScale: number

    // 上段（major）の定義
    /** 上段の単位 */
    majorUnit: "year" | "month" | "week" | "day"
    /** 上段の表示フォーマット */
    majorFormat: string
    /** 上段の間隔（オプション、デフォルトは1単位） */
    majorInterval?: Duration

    // 下段（minor）の定義
    /** 下段の単位 */
    minorUnit: "month" | "week" | "day" | "hour"
    /** 下段の表示フォーマット */
    minorFormat: string
    /** 下段の間隔（Duration） */
    minorInterval: Duration

    /** 説明ラベル（UI表示用） */
    label: string
}

/**
 * Tick定義のリスト（2段構成、降順ソート）
 * tick-generator.tsのデフォルト定義と統一
 */
let TICK_DEFINITIONS: TickDefinition[] = [
    // 時間単位（最も拡大: scale >= 17）
    {
        minScale: 17,
        majorUnit: "day",
        majorFormat: "yyyy/MM/dd",
        minorUnit: "hour",
        minorFormat: "HH",
        minorInterval: Duration.fromObject({ hours: 1 }),
        label: "1時間",
    },
    {
        minScale: 5.5,
        majorUnit: "day",
        majorFormat: "MM/dd",
        minorUnit: "hour",
        minorFormat: "HH",
        minorInterval: Duration.fromObject({ hours: 3 }),
        label: "3時間",
    },
    {
        minScale: 2.8,
        majorUnit: "day",
        majorFormat: "MM/dd",
        minorUnit: "hour",
        minorFormat: "HH",
        minorInterval: Duration.fromObject({ hours: 6 }),
        label: "6時間",
    },
    {
        minScale: 1.4,
        majorUnit: "day",
        majorFormat: "MM/dd",
        minorUnit: "hour",
        minorFormat: "HH",
        minorInterval: Duration.fromObject({ hours: 12 }),
        label: "12時間",
    },
    // 日単位（scale >= 0.95）
    {
        minScale: 0.95,
        majorUnit: "month",
        majorFormat: "yyyy/MM",
        minorUnit: "day",
        minorFormat: "dd",
        minorInterval: Duration.fromObject({ days: 1 }),
        label: "1日",
    },
    {
        minScale: 0.48,
        majorUnit: "month",
        majorFormat: "yyyy/MM",
        minorUnit: "day",
        minorFormat: "dd",
        minorInterval: Duration.fromObject({ days: 2 }),
        label: "2日",
    },
    {
        minScale: 0.24,
        majorUnit: "month",
        majorFormat: "yyyy/MM",
        minorUnit: "day",
        minorFormat: "dd",
        minorInterval: Duration.fromObject({ days: 4 }),
        label: "4日",
    },
    // 週単位（scale >= 0.17）
    {
        minScale: 0.17,
        majorUnit: "month",
        majorFormat: "yyyy/MM",
        minorUnit: "week",
        minorFormat: "MM/dd",
        minorInterval: Duration.fromObject({ weeks: 1 }),
        label: "1週間",
    },
    {
        minScale: 0.085,
        majorUnit: "month",
        majorFormat: "yyyy/MM",
        minorUnit: "week",
        minorFormat: "MM/dd",
        minorInterval: Duration.fromObject({ weeks: 2 }),
        label: "2週間",
    },
    // 月単位（scale >= 0.04）
    {
        minScale: 0.04,
        majorUnit: "year",
        majorFormat: "yyyy",
        minorUnit: "month",
        minorFormat: "MM/dd",
        minorInterval: Duration.fromObject({ months: 1 }),
        label: "1ヶ月",
    },
    {
        minScale: 0.013,
        majorUnit: "year",
        majorFormat: "yyyy",
        minorUnit: "month",
        minorFormat: "MM/dd",
        minorInterval: Duration.fromObject({ months: 3 }),
        label: "3ヶ月",
    },
    // 年単位（最も縮小: scale < 0.013）
    {
        minScale: 0,
        majorUnit: "year",
        majorFormat: "yyyy",
        minorUnit: "month",
        minorFormat: "MMM",
        minorInterval: Duration.fromObject({ months: 1 }),
        label: "1年",
    },
]

/**
 * 現在のズームスケールに対応するTick定義を取得
 *
 * @param scale - ズームスケール値（1.0 = デフォルト、大きいほど拡大）
 * @returns 適用すべきTick定義
 */
export function getTickDefinitionForScale(scale: number): TickDefinition {
    // スケールに対応する定義を探す（降順でチェック）
    for (const def of TICK_DEFINITIONS) {
        if (scale >= def.minScale) {
            return def
        }
    }

    // フォールバック：最も粗い定義
    return TICK_DEFINITIONS[TICK_DEFINITIONS.length - 1]
}

/**
 * ズームスケールから1日あたりのピクセル幅を計算
 *
 * markwkenの実装を参考に、スケール値をピクセル幅に変換。
 * 基準値（scale = 1.0）での1日幅を40pxとする。
 *
 * @param scale - ズームスケール値
 * @returns 1日あたりのピクセル幅
 */
export function getDayWidthFromScale(scale: number): number {
    const BASE_DAY_WIDTH = 40 // scale = 1.0のときの1日幅
    return BASE_DAY_WIDTH * scale
}

/**
 * ピクセル幅からズームスケールを計算（逆変換）
 *
 * @param dayWidth - 1日あたりのピクセル幅
 * @returns ズームスケール値
 */
export function getScaleFromDayWidth(dayWidth: number): number {
    const BASE_DAY_WIDTH = 40
    return dayWidth / BASE_DAY_WIDTH
}

/**
 * ズームスケールの制限範囲
 */
export const ZOOM_SCALE_LIMITS = {
    min: 0.1, // 最小（最も縮小）
    max: 200, // 最大（最も拡大）
    default: 1.0, // デフォルト
}

/**
 * カスタムズーム定義を追加
 *
 * @param definition - 追加するカスタム定義
 */
export function addCustomTickDefinition(definition: TickDefinition): void {
    // 既存の定義で同じminScaleがあれば置き換え
    const existingIndex = TICK_DEFINITIONS.findIndex(
        (d) => d.minScale === definition.minScale,
    )

    if (existingIndex >= 0) {
        TICK_DEFINITIONS[existingIndex] = definition
        console.log("🔄 ズーム定義を更新:", definition)
    } else {
        TICK_DEFINITIONS.push(definition)
        console.log("➕ ズーム定義を追加:", definition)
    }

    // minScaleの降順でソート
    TICK_DEFINITIONS.sort((a, b) => b.minScale - a.minScale)
}

/**
 * カスタムズーム定義を削除
 *
 * @param minScale - 削除する定義のminScale
 */
export function removeCustomTickDefinition(minScale: number): void {
    const index = TICK_DEFINITIONS.findIndex((d) => d.minScale === minScale)
    if (index >= 0) {
        TICK_DEFINITIONS.splice(index, 1)
        console.log("🗑️ ズーム定義を削除:", minScale)
    }
}

/**
 * すべてのズーム定義を取得（読み取り専用）
 */
export function getAllTickDefinitions(): readonly TickDefinition[] {
    return [...TICK_DEFINITIONS]
}

/**
 * Tick定義を更新（インデックス指定）
 *
 * @param index - 更新する定義のインデックス
 * @param definition - 新しい定義
 */
export function updateTickDefinition(
    index: number,
    definition: TickDefinition,
): void {
    if (index >= 0 && index < TICK_DEFINITIONS.length) {
        TICK_DEFINITIONS[index] = definition
        // minScaleの降順でソート
        TICK_DEFINITIONS.sort((a, b) => b.minScale - a.minScale)
        console.log("🔄 ズーム定義を更新:", definition)
    }
}
