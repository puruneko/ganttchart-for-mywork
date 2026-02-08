/**
 * 2段構成のタイムラインヘッダー用tick生成システム
 * 
 * 上段（majorTicks）: 大きい単位（年、月、週など）
 * 下段（minorTicks）: 小さい単位（日、時間など）
 */

import { DateTime, Duration } from 'luxon';
import type { DateRange } from '../types';

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
 * ズームスケールに応じた2段tick定義を取得
 * 
 * デフォルト（scale = 1.0）: 上段=月、下段=日（1日ごと）
 * 
 * セル幅の最小値を考慮:
 * - 時間単位: 最小30px (1時間 = 30px → scale 0.72以上)
 * - 日単位: 最小40px (1日 = 40px → scale 0.96以上)
 * - 週単位: 最小50px (1週間 = 50px → scale 0.20以上)
 * - 月単位: 最小50px (1ヶ月 = 50px → scale 0.06以上)
 */
export function getTickGenerationDefForScale(scale: number): TickGenerationDef {
  // 時間単位（最も拡大）
  // 1時間 = scale * 42 (1日42px / 24時間)
  if (scale >= 17) { // 1時間 ≈ 714px
    return {
      majorUnit: 'day',
      majorFormat: 'yyyy年M月d日',
      minorUnit: 'hour',
      minorFormat: 'HH:mm',
      minorInterval: Duration.fromObject({ hours: 1 })
    };
  }
  if (scale >= 5.5) { // 3時間 ≈ 693px
    return {
      majorUnit: 'day',
      majorFormat: 'M月d日',
      minorUnit: 'hour',
      minorFormat: 'HH:mm',
      minorInterval: Duration.fromObject({ hours: 3 })
    };
  }
  if (scale >= 2.8) { // 6時間 ≈ 706px
    return {
      majorUnit: 'day',
      majorFormat: 'M月d日',
      minorUnit: 'hour',
      minorFormat: 'HH:mm',
      minorInterval: Duration.fromObject({ hours: 6 })
    };
  }
  if (scale >= 1.4) { // 12時間 ≈ 706px
    return {
      majorUnit: 'day',
      majorFormat: 'M月d日',
      minorUnit: 'hour',
      minorFormat: 'HH:mm',
      minorInterval: Duration.fromObject({ hours: 12 })
    };
  }
  
  // 日単位（デフォルトはここ: scale = 1.0の場合）
  // 1日 = scale * 42px
  if (scale >= 0.95) { // 1日 ≈ 40px
    return {
      majorUnit: 'month',
      majorFormat: 'M月',
      minorUnit: 'day',
      minorFormat: 'd日',
      minorInterval: Duration.fromObject({ days: 1 })
    };
  }
  if (scale >= 0.48) { // 2日 ≈ 40px
    return {
      majorUnit: 'month',
      majorFormat: 'M月',
      minorUnit: 'day',
      minorFormat: 'd日',
      minorInterval: Duration.fromObject({ days: 2 })
    };
  }
  if (scale >= 0.24) { // 4日 ≈ 40px
    return {
      majorUnit: 'month',
      majorFormat: 'M月',
      minorUnit: 'day',
      minorFormat: 'd日',
      minorInterval: Duration.fromObject({ days: 4 })
    };
  }
  
  // 週単位
  // 1週間 = scale * 42 * 7 = scale * 294px
  if (scale >= 0.17) { // 1週間 ≈ 50px
    return {
      majorUnit: 'month',
      majorFormat: 'M月',
      minorUnit: 'week',
      minorFormat: 'M/d',
      minorInterval: Duration.fromObject({ weeks: 1 })
    };
  }
  if (scale >= 0.085) { // 2週間 ≈ 50px
    return {
      majorUnit: 'month',
      majorFormat: 'M月',
      minorUnit: 'week',
      minorFormat: 'M/d',
      minorInterval: Duration.fromObject({ weeks: 2 })
    };
  }
  
  // 月単位
  // 1ヶ月 ≈ scale * 42 * 30 = scale * 1260px
  if (scale >= 0.04) { // 1ヶ月 ≈ 50px
    return {
      majorUnit: 'year',
      majorFormat: 'yyyy年',
      minorUnit: 'month',
      minorFormat: 'M月',
      minorInterval: Duration.fromObject({ months: 1 })
    };
  }
  if (scale >= 0.013) { // 3ヶ月 ≈ 50px
    return {
      majorUnit: 'year',
      majorFormat: 'yyyy年',
      minorUnit: 'month',
      minorFormat: 'M月',
      minorInterval: Duration.fromObject({ months: 3 })
    };
  }
  
  // 年単位（最も縮小）
  return {
    majorUnit: 'year',
    majorFormat: 'yyyy年',
    minorUnit: 'year',
    minorFormat: 'yyyy',
    minorInterval: Duration.fromObject({ years: 1 })
  };
}
