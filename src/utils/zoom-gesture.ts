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
  /** ズームスケールが変更されたときに呼ばれる */
  onZoomChange: (newScale: number, deltaScale: number) => void;
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
  
  constructor(element: HTMLElement, callbacks: ZoomGestureCallbacks, initialScale: number = 1.0) {
    this.element = element;
    this.callbacks = callbacks;
    this.currentScale = initialScale;
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
   * 
   * @param e - WheelEvent
   */
  private handleWheel = (e: WheelEvent): void => {
    // Ctrl/Cmd + ホイールでズーム操作を検出
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      // ホイールのdeltaYからズーム変化量を計算
      // 負の値: ズームイン、正の値: ズームアウト
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = this.currentScale * zoomFactor;
      const deltaScale = newScale - this.currentScale;
      
      this.currentScale = newScale;
      this.callbacks.onZoomChange(newScale, deltaScale);
      
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
  }
}
