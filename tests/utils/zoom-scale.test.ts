/**
 * zoom-scale ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import { getSnapDays } from '../../src/utils/zoom-scale';
import type { SnapDurationMap } from '../../src/types';

describe('getSnapDays', () => {
  const defaultMap: Required<SnapDurationMap> = {
    year:  { weeks: 1 },
    month: { days: 1 },
    week:  { days: 1 },
    day:   { hours: 1 },
  };

  it('year → 1週 = 7日', () => {
    expect(getSnapDays('year', defaultMap)).toBeCloseTo(7);
  });

  it('month → 1日 = 1日', () => {
    expect(getSnapDays('month', defaultMap)).toBeCloseTo(1);
  });

  it('week → 1日 = 1日', () => {
    expect(getSnapDays('week', defaultMap)).toBeCloseTo(1);
  });

  it('day → 1時間 = 1/24日', () => {
    expect(getSnapDays('day', defaultMap)).toBeCloseTo(1 / 24);
  });

  it('カスタムマップ: day → 30分 = 1/48日', () => {
    const custom: SnapDurationMap = { day: { minutes: 30 } };
    expect(getSnapDays('day', custom)).toBeCloseTo(1 / 48);
  });

  it('カスタムマップ: day → 15分 = 1/96日', () => {
    const custom: SnapDurationMap = { day: { minutes: 15 } };
    expect(getSnapDays('day', custom)).toBeCloseTo(1 / 96);
  });

  it('カスタムマップ: year → 2週 = 14日', () => {
    const custom: SnapDurationMap = { year: { weeks: 2 } };
    expect(getSnapDays('year', custom)).toBeCloseTo(14);
  });

  it('マップにキーがない場合はフォールバックを使用する (year → 7日)', () => {
    const emptyMap: SnapDurationMap = {};
    expect(getSnapDays('year', emptyMap)).toBeCloseTo(7);
  });

  it('マップにキーがない場合はフォールバックを使用する (day → 1/24日)', () => {
    const partialMap: SnapDurationMap = { year: { months: 1 } };
    expect(getSnapDays('day', partialMap)).toBeCloseTo(1 / 24);
  });
});
