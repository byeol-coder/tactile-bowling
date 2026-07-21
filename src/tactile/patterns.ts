// 촉각 캔버스(60×40) 기본 드로잉 유틸. 장식 최소화, 오브젝트 간 간격 확보.

export const TW = 60;
export const TH = 40;

export interface TactileFrame {
  width: number;
  height: number;
  dots: boolean[]; // row-major, length = width*height
}

export function blank(): TactileFrame {
  return { width: TW, height: TH, dots: new Array(TW * TH).fill(false) };
}

export function idx(x: number, y: number): number {
  return y * TW + x;
}

export function setDot(f: TactileFrame, x: number, y: number, on = true): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= TW || yi < 0 || yi >= TH) return;
  f.dots[idx(xi, yi)] = on;
}

/** 연속 선(레인 경계). */
export function line(f: TactileFrame, x0: number, y0: number, x1: number, y1: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    setDot(f, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  }
}

/** 점선(가이드/예상 궤적). gap: 점 간격. */
export function dottedLine(f: TactileFrame, x0: number, y0: number, x1: number, y1: number, gap = 3): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += gap) {
    const t = steps === 0 ? 0 : i / steps;
    setDot(f, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  }
}

/** 굵은/이중 궤적(선택된 궤적). */
export function thickDottedLine(f: TactileFrame, pts: { x: number; y: number }[]): void {
  pts.forEach((p) => {
    setDot(f, p.x, p.y);
    setDot(f, p.x + 1, p.y);
  });
}

/** 서 있는 핀: 3점 세로 마커. */
export function pinUp(f: TactileFrame, cx: number, cy: number): void {
  setDot(f, cx, cy - 1);
  setDot(f, cx, cy);
  setDot(f, cx, cy + 1);
}

/** 현재 선택된 핀: 주변 패턴으로 구별. */
export function pinSelected(f: TactileFrame, cx: number, cy: number): void {
  pinUp(f, cx, cy);
  setDot(f, cx - 1, cy);
  setDot(f, cx + 1, cy);
}

/** 볼링공: 2×2 중심 패턴. */
export function ball(f: TactileFrame, cx: number, cy: number): void {
  setDot(f, cx, cy);
  setDot(f, cx + 1, cy);
  setDot(f, cx, cy + 1);
  setDot(f, cx + 1, cy + 1);
}
