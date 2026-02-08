/**
 * ズーム関連ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import { getDayWidthForZoomLevel, getTickIntervalForZoomLevel, getZoomLevelLabel } from './zoom-utils';

describe('getDayWidthForZoomLevel', () => {
  it('ズームレベル1（月単位）で正しいdayWidthを返す', () => {
    expect(getDayWidthForZoomLevel(1)).toBe(10);
  });

  it('ズームレベル2（週単位）で正しいdayWidthを返す', () => {
    expect(getDayWidthForZoomLevel(2)).toBe(20);
  });

  it('ズームレベル3（日単位）で正しいdayWidthを返す', () => {
    expect(getDayWidthForZoomLevel(3)).toBe(40);
  });

  it('ズームレベル4（半日単位）で正しいdayWidthを返す', () => {
    expect(getDayWidthForZoomLevel(4)).toBe(80);
  });

  it('ズームレベル5（時間単位）で正しいdayWidthを返す', () => {
    expect(getDayWidthForZoomLevel(5)).toBe(160);
  });

  it('無効なズームレベルの場合はデフォルト値を返す', () => {
    expect(getDayWidthForZoomLevel(0)).toBe(40);
    expect(getDayWidthForZoomLevel(6)).toBe(40);
    expect(getDayWidthForZoomLevel(10)).toBe(40);
  });
});

describe('getTickIntervalForZoomLevel', () => {
  it('ズームレベル1（月単位）で正しいtickIntervalを返す', () => {
    expect(getTickIntervalForZoomLevel(1)).toBe(30);
  });

  it('ズームレベル2（週単位）で正しいtickIntervalを返す', () => {
    expect(getTickIntervalForZoomLevel(2)).toBe(7);
  });

  it('ズームレベル3（日単位）で正しいtickIntervalを返す', () => {
    expect(getTickIntervalForZoomLevel(3)).toBe(1);
  });

  it('ズームレベル4（半日単位）で正しいtickIntervalを返す', () => {
    expect(getTickIntervalForZoomLevel(4)).toBe(0.5);
  });

  it('ズームレベル5（時間単位）で正しいtickIntervalを返す', () => {
    expect(getTickIntervalForZoomLevel(5)).toBe(0.25);
  });

  it('無効なズームレベルの場合はデフォルト値を返す', () => {
    expect(getTickIntervalForZoomLevel(0)).toBe(1);
    expect(getTickIntervalForZoomLevel(6)).toBe(1);
  });
});

describe('getZoomLevelLabel', () => {
  it('各ズームレベルの正しいラベルを返す', () => {
    expect(getZoomLevelLabel(1)).toBe('月単位');
    expect(getZoomLevelLabel(2)).toBe('週単位');
    expect(getZoomLevelLabel(3)).toBe('日単位');
    expect(getZoomLevelLabel(4)).toBe('半日単位');
    expect(getZoomLevelLabel(5)).toBe('時間単位');
  });

  it('無効なズームレベルの場合はデフォルトラベルを返す', () => {
    expect(getZoomLevelLabel(0)).toBe('日単位');
    expect(getZoomLevelLabel(6)).toBe('日単位');
  });
});
