// 진동 패턴. navigator.vibrate 미지원 환경에서도 게임 진행에 문제 없음.

export type HapticEvent =
  | 'move' | 'fine' | 'release' | 'pinHit'
  | 'strike' | 'spare' | 'open' | 'gutter' | 'turn';

const PATTERNS: Record<HapticEvent, number[]> = {
  move: [20],
  fine: [8],
  release: [120],
  pinHit: [15, 20, 25],
  strike: [90, 40, 90],
  spare: [60, 40, 60],
  open: [40],
  gutter: [220],
  turn: [30, 40, 30],
};

let enabled = true;
export function setHapticsEnabled(v: boolean): void { enabled = v; }

export function haptic(event: HapticEvent): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[event]);
  } catch {
    /* 미지원 — 무시 */
  }
}

/** 파워 충전: 단계가 오를수록 강해지는 진동. */
export function powerHaptic(level: number): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(Math.round(8 + level * 40));
  } catch {
    /* 무시 */
  }
}
