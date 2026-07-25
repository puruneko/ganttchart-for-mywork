/**
 * ラベル（タスク名などのテキスト）の優先度ベースのクリッピング計算
 *
 * 同一行内に複数の表示オブジェクト（plan枠・スケジュールバー・マイルストン）が
 * 重なっている場合、優先度の低いオブジェクトのラベルを高い方に譲る形でクリップする
 * （issue #0028）。
 *
 * 実際のテキスト幅はDOM/Canvasのフォントメトリクス計測に依存するため、
 * ここでは平均的な文字幅比率による概算値を使う。DOM非依存の純粋関数に保つことで、
 * このライブラリの他のユーティリティ（timeline-calculations.ts 等）と同様に
 * 独立してテスト可能にする。
 */

/** 優先度。数値が大きいほど他に譲られにくい（クリップされにくい） */
export type LabelPriority = number

/** 一般的なUIサンセリフフォントにおける平均文字幅の概算比率（フォントサイズに対する倍率） */
const AVG_CHAR_WIDTH_RATIO = 0.58

/** クリップ後の表示幅がこれを下回る場合は、中途半端な断片を見せるよりラベル自体を非表示にする */
const MIN_VISIBLE_WIDTH_PX = 10

/**
 * テキストの概算描画幅を計算する（実測ではなく文字数ベースの近似値）。
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO
}

/**
 * 1行内に存在しうるラベル候補（plan枠 / バー / マイルストンなど）
 */
export interface LabelRegion {
  /** 同一行内で一意な識別子（例: `${nodeId}:bar`） */
  id: string
  /** 優先度。大きいほど優先（クリップされにくい） */
  priority: LabelPriority
  /** ラベルの描画開始X座標（ラベルは常にここから右へ伸びる） */
  anchorX: number
  /** ラベルに表示するテキスト（幅推定に使用） */
  text: string
  /** フォントサイズ（px） */
  fontSize: number
  /** このオブジェクト自身の図形としての占有範囲（開始X） */
  shapeStartX: number
  /** このオブジェクト自身の図形としての占有範囲（終了X） */
  shapeEndX: number
}

export interface LabelClipResult {
  id: string
  /** null の場合はクリップ不要（全文表示） */
  clipWidth: number | null
  /** true の場合はラベル自体を非表示にする（中途半端な断片を避ける） */
  hidden: boolean
}

/**
 * 同一行内のラベル群について、優先度に基づくクリップ幅を計算する。
 *
 * ルール:
 * - 自分より優先度が高い他オブジェクトの「図形範囲の開始位置 − マージン」が、
 *   自分のラベルの自然な描画範囲より手前にある場合、その位置でクリップする。
 * - 複数の高優先度オブジェクトと重なりうる場合は、最も手前（自分に近い側）の
 *   境界を採用する（最も厳しい制約が優先）。
 * - クリップ後の幅が MIN_VISIBLE_WIDTH_PX 未満（＝0や負の場合を含む）なら、
 *   ラベルごと非表示にする。
 * - 優先度が同じ場合は互いにクリップしない（想定外の共倒れを避ける）。
 *
 * @param regions - 同一行に存在する全ラベル候補
 * @param marginPx - 優先度が高い側の視認性を確保するための余白（px）
 */
export function computeLabelClipping(
  regions: LabelRegion[],
  marginPx: number,
): LabelClipResult[] {
  return regions.map((region) => {
    const naturalEndX = region.anchorX + estimateTextWidth(region.text, region.fontSize)

    let clipBoundaryX = Infinity
    for (const other of regions) {
      if (other.id === region.id) continue
      if (other.priority <= region.priority) continue

      const boundary = other.shapeStartX - marginPx
      // 相手の境界が自分の自然な描画範囲より手前にある場合のみ、実際の制約になる
      if (boundary < naturalEndX) {
        clipBoundaryX = Math.min(clipBoundaryX, boundary)
      }
    }

    if (clipBoundaryX === Infinity) {
      return { id: region.id, clipWidth: null, hidden: false }
    }

    const clipWidth = clipBoundaryX - region.anchorX
    if (clipWidth < MIN_VISIBLE_WIDTH_PX) {
      return { id: region.id, clipWidth: 0, hidden: true }
    }
    return { id: region.id, clipWidth, hidden: false }
  })
}
