/**
 * ズーム関連のユーティリティ関数
 */

/**
 * ズームレベルに応じたdayWidthを計算
 * 
 * @param zoomLevel - ズームレベル（1-5）
 * @returns dayWidth（ピクセル）
 */
export function getDayWidthForZoomLevel(zoomLevel: number): number {
  switch (zoomLevel) {
    case 1: // 月単位
      return 10;
    case 2: // 週単位
      return 20;
    case 3: // 日単位（デフォルト）
      return 40;
    case 4: // 半日単位
      return 80;
    case 5: // 時間単位
      return 160;
    default:
      return 40;
  }
}

/**
 * ズームレベルに応じたtickInterval（日数）を計算
 * 
 * @param zoomLevel - ズームレベル（1-5）
 * @returns tickInterval（日数）
 */
export function getTickIntervalForZoomLevel(zoomLevel: number): number {
  switch (zoomLevel) {
    case 1: // 月単位
      return 30;
    case 2: // 週単位
      return 7;
    case 3: // 日単位（デフォルト）
      return 1;
    case 4: // 半日単位
      return 0.5;
    case 5: // 時間単位
      return 0.25; // 6時間
    default:
      return 1;
  }
}

/**
 * ズームレベルの説明を取得
 * 
 * @param zoomLevel - ズームレベル（1-5）
 * @returns 説明文字列
 */
export function getZoomLevelLabel(zoomLevel: number): string {
  switch (zoomLevel) {
    case 1:
      return '月単位';
    case 2:
      return '週単位';
    case 3:
      return '日単位';
    case 4:
      return '半日単位';
    case 5:
      return '時間単位';
    default:
      return '日単位';
  }
}
