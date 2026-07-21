import { describe, it, expect } from 'vitest';
import { frameToDotPadHex, HEX_LEN, BLANK_HEX, CELL_COLS, CELL_ROWS } from './encode';
import { blank, setDot } from '@/tactile/patterns';
import { TW, TH } from '@/tactile/patterns';

describe('frameToDotPadHex — 60×40 → 300바이트/600 hex', () => {
  it('셀 격자는 30×10', () => {
    expect(CELL_COLS).toBe(30);
    expect(CELL_ROWS).toBe(10);
    expect(HEX_LEN).toBe(600);
  });

  it('빈 프레임 → 600개의 0', () => {
    const f = blank();
    expect(frameToDotPadHex(f)).toBe('0'.repeat(600));
    expect(BLANK_HEX).toBe('0'.repeat(600));
  });

  it('모든 핀 켜짐 → 600개의 f', () => {
    const f = blank();
    f.dots.fill(true);
    expect(frameToDotPadHex(f)).toBe('f'.repeat(600));
  });

  it('그리드 (0,0) 한 점 → dotBit = lx*4+ly = 0 → 첫 바이트 0x01', () => {
    const f = blank();
    setDot(f, 0, 0);
    const hex = frameToDotPadHex(f);
    expect(hex.slice(0, 2)).toBe('01');
    expect(hex.slice(2)).toBe('0'.repeat(598));
  });

  it('셀 내 비트 매핑 dotBit=lx*4+ly 검증', () => {
    // 첫 셀(cc=0,cr=0) 안의 각 로컬 좌표가 올바른 비트를 세팅하는지
    const cases: { lx: number; ly: number; bit: number }[] = [
      { lx: 0, ly: 0, bit: 0 }, { lx: 0, ly: 1, bit: 1 }, { lx: 0, ly: 2, bit: 2 }, { lx: 0, ly: 3, bit: 3 },
      { lx: 1, ly: 0, bit: 4 }, { lx: 1, ly: 1, bit: 5 }, { lx: 1, ly: 2, bit: 6 }, { lx: 1, ly: 3, bit: 7 },
    ];
    for (const { lx, ly, bit } of cases) {
      const f = blank();
      setDot(f, lx, ly);
      const firstByte = parseInt(frameToDotPadHex(f).slice(0, 2), 16);
      expect(firstByte).toBe(1 << bit);
    }
  });

  it('두 번째 셀 열(cc=1)의 점은 두 번째 바이트에 들어간다', () => {
    const f = blank();
    setDot(f, 2, 0); // cc=1, lx=0, ly=0
    const hex = frameToDotPadHex(f);
    expect(hex.slice(0, 2)).toBe('00');
    expect(hex.slice(2, 4)).toBe('01');
  });

  it('두 번째 셀 행(cr=1)의 점은 31번째 바이트에 들어간다', () => {
    const f = blank();
    setDot(f, 0, 4); // cr=1, lx=0, ly=0 → byte index = CELL_COLS = 30
    const hex = frameToDotPadHex(f);
    const byteIdx = 30;
    expect(hex.slice(byteIdx * 2, byteIdx * 2 + 2)).toBe('01');
  });

  it('잘못된 크기 프레임은 거부', () => {
    expect(() => frameToDotPadHex({ width: 10, height: 10, dots: new Array(100).fill(false) })).toThrow();
  });

  it('크기 상수 정합성', () => {
    expect(TW).toBe(60);
    expect(TH).toBe(40);
  });
});
