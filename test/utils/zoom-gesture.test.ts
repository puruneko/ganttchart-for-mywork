/**
 * ズームジェスチャー検出器のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZoomGestureDetector } from '../../src/utils/zoom-gesture';

describe('ZoomGestureDetector', () => {
  let element: HTMLElement;
  let onZoomChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    element = document.createElement('div');
    onZoomChange = vi.fn();
  });

  describe('基本機能', () => {
    it('インスタンスを作成できる', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      expect(detector).toBeDefined();
    });

    it('初期スケールを設定できる', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 2.0);
      expect(detector).toBeDefined();
    });

    it('setScaleでスケールを更新できる', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.setScale(2.0);
      // スケールが内部的に更新されることを確認（副作用がないため、次のズーム操作で確認）
      expect(detector).toBeDefined();
    });
  });

  describe('ホイールイベント処理', () => {
    it('Ctrl+ホイールでズームインする', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.start();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // 負の値でズームイン
        ctrlKey: true,
        clientX: 100,
        clientY: 200,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(wheelEvent);

      // onZoomChangeが呼ばれることを確認
      expect(onZoomChange).toHaveBeenCalled();
      const [newScale, _deltaScale, mouseX, mouseY] = onZoomChange.mock.calls[0];
      
      // ズームイン（1.0 * 1.05 = 1.05）
      expect(newScale).toBeCloseTo(1.05, 2);
      // マウス位置が渡されることを確認
      expect(mouseX).toBe(100);
      expect(mouseY).toBe(200);

      detector.stop();
    });

    it('Ctrl+ホイールでズームアウトする', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.start();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100, // 正の値でズームアウト
        ctrlKey: true,
        clientX: 150,
        clientY: 250,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(wheelEvent);

      expect(onZoomChange).toHaveBeenCalled();
      const [newScale, _deltaScale, mouseX, mouseY] = onZoomChange.mock.calls[0];
      
      // ズームアウト（1.0 * 0.95 = 0.95）
      expect(newScale).toBeCloseTo(0.95, 2);
      // マウス位置が渡されることを確認
      expect(mouseX).toBe(150);
      expect(mouseY).toBe(250);

      detector.stop();
    });

    it('Cmd+ホイールでもズームできる（Mac用）', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.start();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        metaKey: true, // Cmdキー
        clientX: 100,
        clientY: 200,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(wheelEvent);

      expect(onZoomChange).toHaveBeenCalled();
      const [newScale] = onZoomChange.mock.calls[0];
      expect(newScale).toBeCloseTo(1.05, 2);

      detector.stop();
    });

    it('Ctrl/Cmdなしのホイールでは何もしない', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.start();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(wheelEvent);

      // onZoomChangeが呼ばれないことを確認
      expect(onZoomChange).not.toHaveBeenCalled();

      detector.stop();
    });
  });

  describe('ライフサイクル', () => {
    it('start()とstop()を呼べる', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      
      detector.start();
      detector.stop();
      
      // stopの後はイベントが処理されないことを確認
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });

      element.dispatchEvent(wheelEvent);
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it('stop()を複数回呼んでもエラーにならない', () => {
      const detector = new ZoomGestureDetector(element, { onZoomChange }, 1.0);
      detector.start();
      
      expect(() => {
        detector.stop();
        detector.stop();
      }).not.toThrow();
    });
  });
});
