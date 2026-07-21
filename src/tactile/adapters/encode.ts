import { TW, TH, type TactileFrame } from '@/tactile/patterns';

// DotPad 320 그래픽 포맷:
//  - 60×40 핀 = 셀 2×4핀 → 30×10 셀 = 300바이트 = 600 hex 문자
//  - 셀 내 비트 인덱스 dotBit = lx*4 + ly  (lx 0..1, ly 0..3)
//  - 셀 순서: 위→아래(cellRow), 왼→오른(cellCol) 래스터
export const CELL_W = 2;
export const CELL_H = 4;
export const CELL_COLS = TW / CELL_W; // 30
export const CELL_ROWS = TH / CELL_H; // 10
export const HEX_LEN = CELL_COLS * CELL_ROWS * 2; // 600

/** 60×40 촉각 프레임을 DotPad displayGraphicData 용 600자 hex 로 변환. */
export function frameToDotPadHex(frame: TactileFrame): string {
  if (frame.width !== TW || frame.height !== TH) {
    throw new Error(`DotPad 인코딩은 ${TW}×${TH} 프레임만 지원합니다.`);
  }
  const d = frame.dots;
  let out = '';
  for (let cr = 0; cr < CELL_ROWS; cr++) {
    for (let cc = 0; cc < CELL_COLS; cc++) {
      let byte = 0;
      for (let lx = 0; lx < CELL_W; lx++) {
        for (let ly = 0; ly < CELL_H; ly++) {
          const gx = cc * CELL_W + lx;
          const gy = cr * CELL_H + ly;
          if (d[gy * TW + gx]) byte |= 1 << (lx * 4 + ly);
        }
      }
      out += byte.toString(16).padStart(2, '0');
    }
  }
  return out;
}

/** 모든 핀 내림(빈 화면) hex. */
export const BLANK_HEX = '0'.repeat(HEX_LEN);
