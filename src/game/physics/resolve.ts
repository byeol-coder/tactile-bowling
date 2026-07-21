// 결정론적 투구 해석. 같은 입력(ThrowParams + standing + seed)이면 항상 같은 결과.
// 촉각/음향/시각이 동일한 상태를 공유할 수 있도록 순수 함수로 구현.

import type { PinState, ThrowParams, Vec2 } from '@/game/types';

/** 정식 10핀 삼각 배치. x: -1~1(가로), depth: 0(앞)~1(뒤). */
export const PIN_LAYOUT: readonly Vec2[] = [
  { x: 0.0, y: 0.0 }, // 1
  { x: -0.18, y: 0.33 }, // 2
  { x: 0.18, y: 0.33 }, // 3
  { x: -0.36, y: 0.66 }, // 4
  { x: 0.0, y: 0.66 }, // 5
  { x: 0.36, y: 0.66 }, // 6
  { x: -0.54, y: 1.0 }, // 7
  { x: -0.18, y: 1.0 }, // 8
  { x: 0.18, y: 1.0 }, // 9
  { x: 0.54, y: 1.0 }, // 10
];

export const ALL_UP: PinState = PIN_LAYOUT.map(() => true);

/** 결정론적 시드 RNG(mulberry32). 리플레이 재현성을 위해 항상 시드에서 파생. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 투구 매개변수로부터 안정적인 정수 시드 생성(파라미터가 곧 리플레이 키). */
export function seedFromParams(p: ThrowParams, standingCount: number): number {
  const q = (v: number) => Math.round((v + 2) * 1000);
  let h = 2166136261 >>> 0;
  for (const v of [q(p.position), q(p.angle / 45), q(p.power), q(p.spin), standingCount]) {
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 특정 깊이에서의 공 가로 위치. angle=조준 드리프트, spin=후반 훅 커브. */
export function ballXAtDepth(p: ThrowParams, depth: number): number {
  const aim = p.position + (p.angle / 30) * depth;
  const hook = p.spin * 0.45 * depth * depth;
  return aim + hook;
}

export interface ThrowResult {
  fallen: number[]; // 이번 투구로 새로 쓰러진 핀 index
  standing: PinState; // 투구 후 상태
  pinsDown: number; // fallen.length
  gutter: boolean;
  path: Vec2[]; // 공 궤적 샘플(시각/촉각 렌더용)
}

/**
 * 투구 해석. standing: 투구 전 서 있는 핀 상태.
 * seed 를 명시하면 완전 재현 가능(미지정 시 파라미터에서 파생).
 */
export function resolveThrow(
  params: ThrowParams,
  standing: PinState,
  seed?: number,
): ThrowResult {
  const standingCount = standing.filter(Boolean).length;
  const rng = mulberry32(seed ?? seedFromParams(params, standingCount));

  const path: Vec2[] = [];
  for (let i = 0; i <= 10; i++) {
    const d = i / 10;
    path.push({ x: clamp(ballXAtDepth(params, d), -1.2, 1.2), y: d });
  }

  const entryX = ballXAtDepth(params, 1);
  const gutter = Math.abs(entryX) > 0.95;

  const next = standing.slice();
  if (gutter) {
    return { fallen: [], standing: next, pinsDown: 0, gutter: true, path };
  }

  // 파워가 클수록 타격 폭과 연쇄 반경이 커진다. 완전히 결정론적(재현 가능).
  const hitRadius = 0.11 + params.power * 0.14;
  const chainRadius = 0.26 + params.power * 0.16;
  const fallen: number[] = [];
  void rng; // 시드 RNG 는 향후 확장용(현재 물리는 결정론적)

  // 1) 직접 타격: 공 궤적이 핀 근처를 지나면 쓰러짐.
  PIN_LAYOUT.forEach((pin, i) => {
    if (!next[i]) return;
    const bx = ballXAtDepth(params, pin.y);
    if (Math.abs(pin.x - bx) < hitRadius) {
      next[i] = false;
      fallen.push(i);
    }
  });

  // 2) 연쇄 반응: 쓰러진 핀이 반경 내 서 있는 핀을 넘어뜨림(거리 임계값, 결정론적).
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < PIN_LAYOUT.length; i++) {
      if (next[i]) continue; // 쓰러진 핀 기준
      for (let j = 0; j < PIN_LAYOUT.length; j++) {
        if (i === j || !next[j]) continue;
        const dist = Math.hypot(PIN_LAYOUT[i].x - PIN_LAYOUT[j].x, PIN_LAYOUT[i].y - PIN_LAYOUT[j].y);
        if (dist < chainRadius) {
          next[j] = false;
          fallen.push(j);
          changed = true;
        }
      }
    }
  }

  return {
    fallen: fallen.sort((a, b) => a - b),
    standing: next,
    pinsDown: fallen.length,
    gutter: false,
    path,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
