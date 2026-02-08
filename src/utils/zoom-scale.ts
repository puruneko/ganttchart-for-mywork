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

import { DateTime, Duration } from 'luxon';

/**
 * Tick定義
 * 特定のズーム範囲に対応する時間単位とフォーマット
 */
export interface TickDefinition {
  /** この定義が適用される最小スケール値 */
  minScale: number;
  /** Tick間隔（Luxon Duration） */
  interval: Duration;
  /** 主目盛りの表示フォーマット */
  majorFormat: string;
  /** 副目盛りの表示フォーマット（オプション） */
  minorFormat?: string;
  /** 説明ラベル */
  label: string;
}

/**
 * Tick定義のリスト（スケールの小さい順）
 * markwkenの実装を参考に、より細かい粒度に対応
 */
const TICK_DEFINITIONS: TickDefinition[] = [
  // 時間単位（最も拡大）
  {
    minScale: 100,
    interval: Duration.fromObject({ hours: 1 }),
    majorFormat: 'HH:mm',
    minorFormat: 'dd MMM',
    label: '1時間',
  },
  {
    minScale: 50,
    interval: Duration.fromObject({ hours: 3 }),
    majorFormat: 'HH:mm',
    minorFormat: 'dd MMM',
    label: '3時間',
  },
  {
    minScale: 25,
    interval: Duration.fromObject({ hours: 6 }),
    majorFormat: 'HH:mm',
    minorFormat: 'dd MMM',
    label: '6時間',
  },
  {
    minScale: 12,
    interval: Duration.fromObject({ hours: 12 }),
    majorFormat: 'HH:mm',
    minorFormat: 'dd MMM',
    label: '12時間',
  },
  // 日単位
  {
    minScale: 6,
    interval: Duration.fromObject({ days: 1 }),
    majorFormat: 'dd',
    minorFormat: 'MMM yyyy',
    label: '1日',
  },
  {
    minScale: 3,
    interval: Duration.fromObject({ days: 2 }),
    majorFormat: 'dd',
    minorFormat: 'MMM yyyy',
    label: '2日',
  },
  // 週単位
  {
    minScale: 1.5,
    interval: Duration.fromObject({ weeks: 1 }),
    majorFormat: 'dd MMM',
    minorFormat: 'yyyy',
    label: '1週間',
  },
  {
    minScale: 0.8,
    interval: Duration.fromObject({ weeks: 2 }),
    majorFormat: 'dd MMM',
    minorFormat: 'yyyy',
    label: '2週間',
  },
  // 月単位
  {
    minScale: 0.4,
    interval: Duration.fromObject({ months: 1 }),
    majorFormat: 'MMM',
    minorFormat: 'yyyy',
    label: '1ヶ月',
  },
  {
    minScale: 0.2,
    interval: Duration.fromObject({ months: 3 }),
    majorFormat: 'MMM',
    minorFormat: 'yyyy',
    label: '3ヶ月',
  },
  // 年単位（最も縮小）
  {
    minScale: 0,
    interval: Duration.fromObject({ years: 1 }),
    majorFormat: 'yyyy',
    minorFormat: '',
    label: '1年',
  },
];

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
      return def;
    }
  }
  
  // フォールバック：最も粗い定義
  return TICK_DEFINITIONS[TICK_DEFINITIONS.length - 1];
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
  const BASE_DAY_WIDTH = 40; // scale = 1.0のときの1日幅
  return BASE_DAY_WIDTH * scale;
}

/**
 * ピクセル幅からズームスケールを計算（逆変換）
 * 
 * @param dayWidth - 1日あたりのピクセル幅
 * @returns ズームスケール値
 */
export function getScaleFromDayWidth(dayWidth: number): number {
  const BASE_DAY_WIDTH = 40;
  return dayWidth / BASE_DAY_WIDTH;
}

/**
 * ズームスケールの制限範囲
 */
export const ZOOM_SCALE_LIMITS = {
  min: 0.1,  // 最小（最も縮小）
  max: 200,  // 最大（最も拡大）
  default: 1.0, // デフォルト
};
