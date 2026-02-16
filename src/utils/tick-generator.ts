/**
 * 2段構成のタイムラインヘッダー用tick生成システム
 * 
 * 上段（majorTicks）: 大きい単位（年、月、週など）
 * 下段（minorTicks）: 小さい単位（日、時間など）
 */

import { DateTime, Duration } from 'luxon';
import type { DateRange } from '../types';
import { getTickDefinitionForScale } from './zoom-scale';

/**
 * Tick情報（単一のtick）
 */
export interface Tick {
  /** Tickの開始日時 */
  start: DateTime;
  /** Tickの終了日時（次のtickの開始位置） */
  end: DateTime;
  /** 表示ラベル */
  label: string;
}

/**
 * 2段Tick構成
 */
export interface TwoLevelTicks {
  /** 上段（大単位） */
  majorTicks: Tick[];
  /** 下段（小単位） */
  minorTicks: Tick[];
}

/**
 * Tick生成定義
 */
export interface TickGenerationDef {
  /** 上段の単位 */
  majorUnit: 'year' | 'month' | 'week' | 'day';
  /** 上段のフォーマット */
  majorFormat: string;
  /** 下段の単位 */
  minorUnit: 'month' | 'week' | 'day' | 'hour';
  /** 下段のフォーマット */
  minorFormat: string;
  /** 下段の間隔（Duration） */
  minorInterval: Duration;
}

/**
 * 日付範囲内のtickを生成（単一レベル）
 */
function generateTicks(
  dateRange: DateRange,
  unit: 'year' | 'month' | 'week' | 'day' | 'hour',
  format: string,
  interval?: Duration
): Tick[] {
  const ticks: Tick[] = [];
  let current = dateRange.start.startOf(unit as any);
  
  // 開始日より前の場合は、次の単位まで進める
  if (current < dateRange.start) {
    if (interval) {
      current = current.plus(interval);
    } else {
      current = current.plus({ [unit + 's']: 1 });
    }
  }
  
  while (current <= dateRange.end) {
    let next: DateTime;
    if (interval) {
      next = current.plus(interval);
    } else {
      next = current.plus({ [unit + 's']: 1 });
    }
    
    ticks.push({
      start: current,
      end: next,
      label: current.toFormat(format)
    });
    
    current = next;
  }
  
  return ticks;
}

/**
 * 2段構成のtickを生成
 */
export function generateTwoLevelTicks(
  dateRange: DateRange,
  def: TickGenerationDef
): TwoLevelTicks {
  const majorTicks = generateTicks(dateRange, def.majorUnit, def.majorFormat);
  const minorTicks = generateTicks(dateRange, def.minorUnit, def.minorFormat, def.minorInterval);
  
  return {
    majorTicks,
    minorTicks
  };
}

/**
 * カスタムズーム定義を保存
 */
let customTickDefs: Map<number, TickGenerationDef> = new Map();

/**
 * カスタムズーム定義を追加/更新
 */
export function addCustomTickGenerationDef(minScale: number, def: TickGenerationDef): void {
  customTickDefs.set(minScale, def);
  console.log('🔄 カスタムズーム定義を更新:', minScale, def);
}

/**
 * カスタムズーム定義をクリア
 */
export function clearCustomTickGenerationDefs(): void {
  customTickDefs.clear();
}

/**
 * ズームスケールに応じた2段tick定義を取得
 * 
 * zoom-scale.tsのTickDefinitionから変換して取得
 */
export function getTickGenerationDefForScale(scale: number): TickGenerationDef {
  // カスタム定義をチェック
  for (const [minScale, def] of Array.from(customTickDefs.entries()).sort((a, b) => b[0] - a[0])) {
    if (scale >= minScale) {
      return def;
    }
  }
  
  // TickDefinitionから取得（zoom-scale.tsと統一）
  const tickDef = getTickDefinitionForScale(scale);
  
  return {
    majorUnit: tickDef.majorUnit,
    majorFormat: tickDef.majorFormat,
    minorUnit: tickDef.minorUnit,
    minorFormat: tickDef.minorFormat,
    minorInterval: tickDef.minorInterval,
  };
}
