/**
 * ラベルクリッピング計算（issue #0028）のテスト
 */

import { describe, it, expect } from 'vitest';
import { computeLabelClipping, estimateTextWidth } from '../../src/utils/label-layout';
import type { LabelRegion } from '../../src/utils/label-layout';

const MARGIN = 6;
const FONT_SIZE = 12;

describe('estimateTextWidth', () => {
  it('文字数とフォントサイズに比例した幅を返す', () => {
    expect(estimateTextWidth('abcd', 10)).toBeCloseTo(4 * 10 * 0.58, 5);
    expect(estimateTextWidth('', 10)).toBe(0);
  });
});

describe('computeLabelClipping', () => {
  it('重なりが無い場合はどのラベルもクリップされない', () => {
    const regions: LabelRegion[] = [
      { id: 'a', priority: 0, anchorX: 0, text: 'A', fontSize: FONT_SIZE, shapeStartX: 0, shapeEndX: 20 },
      { id: 'b', priority: 1, anchorX: 500, text: 'B', fontSize: FONT_SIZE, shapeStartX: 500, shapeEndX: 520 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    expect(results).toEqual([
      { id: 'a', clipWidth: null, hidden: false },
      { id: 'b', clipWidth: null, hidden: false },
    ]);
  });

  it('優先度が低いラベルは、優先度が高い側の図形の手前でクリップされる', () => {
    const regions: LabelRegion[] = [
      // 'plan' のラベルは十分長く、'bar' の図形（x=50〜100）に食い込む位置にある
      { id: 'plan', priority: 0, anchorX: 0, text: 'とても長いタスク名です', fontSize: FONT_SIZE, shapeStartX: 0, shapeEndX: 200 },
      { id: 'bar', priority: 1, anchorX: 58, text: 'X', fontSize: FONT_SIZE, shapeStartX: 50, shapeEndX: 100 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    const planResult = results.find(r => r.id === 'plan')!;
    const barResult = results.find(r => r.id === 'bar')!;

    // plan は bar の shapeStartX(50) - margin(6) = 44 でクリップされる
    expect(planResult.clipWidth).toBe(44);
    expect(planResult.hidden).toBe(false);
    // bar は誰にも優先度で負けないため、クリップされない
    expect(barResult.clipWidth).toBeNull();
  });

  it('優先度の高いオブジェクトは決してクリップされない', () => {
    const regions: LabelRegion[] = [
      { id: 'plan', priority: 0, anchorX: 0, text: 'A', fontSize: FONT_SIZE, shapeStartX: 0, shapeEndX: 10 },
      { id: 'milestone', priority: 2, anchorX: 5, text: 'とても長いマイルストン名です', fontSize: FONT_SIZE, shapeStartX: 5, shapeEndX: 20 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    const milestoneResult = results.find(r => r.id === 'milestone')!;
    expect(milestoneResult.clipWidth).toBeNull();
    expect(milestoneResult.hidden).toBe(false);
  });

  it('クリップ後の幅が最小表示幅を下回る場合はラベルごと非表示になる', () => {
    const regions: LabelRegion[] = [
      { id: 'plan', priority: 0, anchorX: 40, text: 'とても長いタスク名です', fontSize: FONT_SIZE, shapeStartX: 40, shapeEndX: 200 },
      // bar の図形開始位置が plan のアンカーのすぐ右（マージンを引くとアンカーより手前になる）
      { id: 'bar', priority: 1, anchorX: 200, text: 'X', fontSize: FONT_SIZE, shapeStartX: 44, shapeEndX: 100 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    const planResult = results.find(r => r.id === 'plan')!;
    expect(planResult.hidden).toBe(true);
    expect(planResult.clipWidth).toBe(0);
  });

  it('複数の高優先度オブジェクトと重なる場合は最も手前の境界を採用する', () => {
    const regions: LabelRegion[] = [
      { id: 'plan', priority: 0, anchorX: 0, text: 'とても長いタスク名がここに入ります', fontSize: FONT_SIZE, shapeStartX: 0, shapeEndX: 300 },
      { id: 'bar', priority: 1, anchorX: 150, text: 'X', fontSize: FONT_SIZE, shapeStartX: 150, shapeEndX: 180 },
      { id: 'milestone', priority: 2, anchorX: 80, text: 'Y', fontSize: FONT_SIZE, shapeStartX: 80, shapeEndX: 90 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    const planResult = results.find(r => r.id === 'plan')!;
    // milestone(80-6=74) の方が bar(150-6=144) より手前 → 74 が採用される
    expect(planResult.clipWidth).toBe(74);
  });

  it('優先度が同じラベル同士は互いにクリップしない', () => {
    const regions: LabelRegion[] = [
      { id: 'a', priority: 1, anchorX: 0, text: 'とても長いラベルAです', fontSize: FONT_SIZE, shapeStartX: 0, shapeEndX: 300 },
      { id: 'b', priority: 1, anchorX: 50, text: 'B', fontSize: FONT_SIZE, shapeStartX: 50, shapeEndX: 60 },
    ];

    const results = computeLabelClipping(regions, MARGIN);
    expect(results.every(r => r.clipWidth === null && !r.hidden)).toBe(true);
  });
});
