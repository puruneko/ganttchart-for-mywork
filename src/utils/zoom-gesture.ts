/**
 * ズームジェスチャー検出器
 * 
 * Hammer.jsを使用してトラックパッドのピンチやホイール操作を検出し、
 * ズームスケールの変更を滑らかに処理する。
 * 
 * markwkenの実装を参考に、gestureベースで統一的に扱う。
 */

import Hammer from 'hammerjs';

/**
 * ズームジェスチャーのコールバック
 */
export interface ZoomGestureCallbacks {
  /** ズームスケールが変更されたときに呼ばれる（マウス位置情報を含む） */
  onZoomChange: (newScale: number, deltaScale: number, mouseX?: number, mouseY?: number) => void;
}

/**
 * ズームジェスチャー検出器
 */
export class ZoomGestureDetector {
  private hammer: HammerManager | null = null;
  private element: HTMLElement;
  private callbacks: ZoomGestureCallbacks;
  private currentScale: number;
  private wheelTimeout: number | null = null;
  private rafId: number | null = null;
  private pendingScale: number | null = null;
  private pendingMouseX: number = 0;
  private pendingMouseY: number = 0;
  private lastCallbackScale: number;

  constructor(element: HTMLElement, callbacks: ZoomGestureCallbacks, initialScale: number = 1.0) {
    this.element = element;
    this.callbacks = callbacks;
    this.currentScale = initialScale;
    this.lastCallbackScale = initialScale;
  }
  
  /**
   * ジェスチャー検出を開始
   */
  start(): void {
    // Hammer.jsでピンチジェスチャーを検出
    this.hammer = new Hammer.Manager(this.element);
    
    // ピンチジェスチャーの設定
    const pinch = new Hammer.Pinch();
    this.hammer.add(pinch);
    
    // ピンチイベントのハンドラー
    let pinchStartScale = this.currentScale;
    
    this.hammer.on('pinchstart', () => {
      pinchStartScale = this.currentScale;
    });
    
    this.hammer.on('pinchmove', (e: HammerInput) => {
      // ピンチのスケールを現在のズームスケールに適用
      const newScale = pinchStartScale * e.scale;
      const deltaScale = newScale - this.currentScale;
      
      this.currentScale = newScale;
      this.callbacks.onZoomChange(newScale, deltaScale);
    });
    
    // ホイールイベントの検出（Hammer.jsでは直接サポートされないため、独自に処理）
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
  }
  
  /**
   * ホイールイベントのハンドラー
   * 
   * トラックパッドのピンチやマウスホイールを検出して、
   * ズームスケールを調整する。
   * マウスポインタの位置を中心にズームする。
   * 
   * @param e - WheelEvent
   */
  /**
   * スケール値に応じた適応型ズームステップを返す
   * 高倍率では大きなステップ、低倍率では小さなステップを使用し、
   * 各ズームレベルで適切なホイール回数でレベル遷移できるようにする
   */
  private getAdaptiveZoomStep(scale: number): number {
    if (scale >= 5.0) return 0.12;  // 高倍率: 約9回で次レベルへ
    if (scale >= 1.0) return 0.08;  // 中倍率: 約10回で次レベルへ
    if (scale >= 0.1) return 0.06;  // 低倍率: 約12回で次レベルへ
    return 0.04;                     // 超低倍率
  }

  /**
   * rAFを使ってコールバックを1フレームに1回に制限する
   * 連続ホイールイベントをバッチ処理し、不要な再描画を削減する
   */
  private scheduleZoomCallback(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.pendingScale !== null) {
        const deltaScale = this.pendingScale - this.lastCallbackScale;
        this.callbacks.onZoomChange(this.pendingScale, deltaScale, this.pendingMouseX, this.pendingMouseY);
        this.lastCallbackScale = this.pendingScale;
        this.pendingScale = null;
      }
    });
  }

  private handleWheel = (e: WheelEvent): void => {
    // Ctrl/Cmd + ホイールでズーム操作を検出
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      // スケール適応型のズームステップを計算
      // deltaYの大きさでトラックパッド（小値）とマウスホイール（大値）を考慮
      const baseStep = this.getAdaptiveZoomStep(this.currentScale);
      const normalizedDelta = Math.min(Math.abs(e.deltaY) / 100, 3.0);
      const step = baseStep * Math.max(normalizedDelta, 0.5);

      // 負のdeltaY: ズームイン（スケール増加）、正のdeltaY: ズームアウト（スケール減少）
      const zoomFactor = e.deltaY > 0 ? (1 - step) : (1 + step);
      this.currentScale = this.currentScale * zoomFactor;

      // マウス位置を記録し、rAFでコールバックをバッチ処理
      this.pendingScale = this.currentScale;
      this.pendingMouseX = e.clientX;
      this.pendingMouseY = e.clientY;
      this.scheduleZoomCallback();

      // デバウンス処理：連続的なホイール操作を滑らかに処理
      if (this.wheelTimeout !== null) {
        window.clearTimeout(this.wheelTimeout);
      }
      this.wheelTimeout = window.setTimeout(() => {
        this.wheelTimeout = null;
      }, 100);
    }
  };
  
  /**
   * 現在のズームスケールを設定
   * 
   * @param scale - 新しいズームスケール
   */
  setScale(scale: number): void {
    this.currentScale = scale;
    this.lastCallbackScale = scale;
  }
  
  /**
   * ジェスチャー検出を停止
   */
  stop(): void {
    if (this.hammer) {
      this.hammer.destroy();
      this.hammer = null;
    }
    
    this.element.removeEventListener('wheel', this.handleWheel);

    if (this.wheelTimeout !== null) {
      window.clearTimeout(this.wheelTimeout);
      this.wheelTimeout = null;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
