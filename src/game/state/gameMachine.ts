// 게임 상태 머신 — UI 와 완전히 분리된 순수 리듀서.
// 싱글/로컬 멀티(2~4인)를 동일한 구조로 처리한다(프레임별 턴 순환).

import type { Player, PinState, ThrowParams, ThrowPhase } from '@/game/types';
import { computeScore } from '@/game/scoring/scoring';
import { ALL_UP, resolveThrow, seedFromParams, type ThrowResult } from '@/game/physics/resolve';

export type ThrowOutcome = 'strike' | 'spare' | 'open' | 'gutter' | 'pins';

export interface PlayerRuntime {
  player: Player;
  rolls: number[];
}

export interface GameState {
  players: PlayerRuntime[];
  current: number; // 현재 플레이어 index
  frame: number; // 0~9
  frameRolls: number[]; // 현재 플레이어가 이 프레임에서 굴린 투구
  phase: ThrowPhase;
  params: ThrowParams;
  standing: PinState;
  lastResult: ThrowResult | null;
  lastOutcome: ThrowOutcome | null;
  finished: boolean;
}

const PHASE_ORDER: ThrowPhase[] = ['announce', 'position', 'angle', 'spin', 'power'];

export const DEFAULT_PARAMS: ThrowParams = { position: 0, angle: 0, power: 0.6, spin: 0 };

export function createGame(players: Player[]): GameState {
  return {
    players: players.map((p) => ({ player: p, rolls: [] })),
    current: 0,
    frame: 0,
    frameRolls: [],
    phase: 'announce',
    params: { ...DEFAULT_PARAMS },
    standing: ALL_UP.slice(),
    lastResult: null,
    lastOutcome: null,
    finished: false,
  };
}

export type Action =
  | { type: 'adjust'; key: keyof ThrowParams; delta: number }
  | { type: 'set'; key: keyof ThrowParams; value: number }
  | { type: 'nextPhase' }
  | { type: 'prevPhase' }
  | { type: 'throw'; seed?: number }
  | { type: 'settle' } // rolling → result 로 전환
  | { type: 'confirmTurn' } // 다음 투구/플레이어로
  | { type: 'restartThrow' };

const LIMITS: Record<keyof ThrowParams, [number, number]> = {
  position: [-1, 1],
  angle: [-20, 20],
  power: [0, 1],
  spin: [-1, 1],
};

function clampParam(key: keyof ThrowParams, v: number): number {
  const [lo, hi] = LIMITS[key];
  return Math.min(hi, Math.max(lo, Number(v.toFixed(3))));
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'adjust':
      if (!isAdjustable(state.phase)) return state;
      return { ...state, params: { ...state.params, [action.key]: clampParam(action.key, state.params[action.key] + action.delta) } };

    case 'set':
      return { ...state, params: { ...state.params, [action.key]: clampParam(action.key, action.value) } };

    case 'nextPhase': {
      const i = PHASE_ORDER.indexOf(state.phase);
      if (i === -1) return state;
      if (i < PHASE_ORDER.length - 1) return { ...state, phase: PHASE_ORDER[i + 1] };
      return state; // power 에서 nextPhase 는 무시(투구는 throw 액션으로)
    }

    case 'prevPhase': {
      const i = PHASE_ORDER.indexOf(state.phase);
      if (i <= 1) return { ...state, phase: 'announce' };
      return { ...state, phase: PHASE_ORDER[i - 1] };
    }

    case 'restartThrow':
      return { ...state, phase: 'position', params: { ...DEFAULT_PARAMS } };

    case 'throw': {
      if (state.phase !== 'power' && state.phase !== 'result') return state;
      const result = resolveThrow(state.params, state.standing, action.seed ?? seedFromParams(state.params, state.standing.filter(Boolean).length));
      return { ...state, phase: 'rolling', lastResult: result };
    }

    case 'settle': {
      if (state.phase !== 'rolling' || !state.lastResult) return state;
      return applyResult(state, state.lastResult);
    }

    case 'confirmTurn':
      if (state.phase !== 'result') return state;
      return advanceTurn(state);

    default:
      return state;
  }
}

function isAdjustable(phase: ThrowPhase): boolean {
  return phase === 'position' || phase === 'angle' || phase === 'spin' || phase === 'power';
}

/** rolling 결과를 실제 점수/상태에 반영하고 outcome 판정. */
function applyResult(state: GameState, result: ThrowResult): GameState {
  const pinsDown = result.pinsDown;
  const standingBefore = state.standing.filter(Boolean).length;
  const player = state.players[state.current];
  const newRolls = [...player.rolls, pinsDown];
  const newFrameRolls = [...state.frameRolls, pinsDown];
  const players = state.players.map((p, i) => (i === state.current ? { ...p, rolls: newRolls } : p));

  const isFirstOfRack = state.frameRolls.length === 0 || needsPinReset(state.frameRolls);
  const outcome = judgeOutcome(standingBefore, pinsDown, result.gutter, isFirstOfRack);

  return {
    ...state,
    players,
    frameRolls: newFrameRolls,
    standing: result.standing,
    phase: 'result',
    lastOutcome: outcome,
    lastResult: result,
  };
}

/**
 * 직전에 서 있던 핀 수(standingBefore)와 쓰러진 수(pinsDown)로 outcome 판정.
 * isFirstOfRack: 이번 투구가 꽉 찬 핀 세트에서 시작했는지.
 */
function judgeOutcome(standingBefore: number, pinsDown: number, gutter: boolean, isFirstOfRack: boolean): ThrowOutcome {
  if (isFirstOfRack && standingBefore === 10 && pinsDown === 10) return 'strike';
  if (!isFirstOfRack && standingBefore > 0 && pinsDown === standingBefore) return 'spare';
  if (pinsDown === 0) return 'gutter';
  if (gutter) return 'gutter';
  return 'pins';
}

/** 현재 프레임이 이 플레이어에게 완료되었는지 판정 + 다음 상태 결정. */
function advanceTurn(state: GameState): GameState {
  const isLast = state.frame === 9;
  const fr = state.frameRolls;
  const frameDone = isFrameDone(fr, isLast);

  // 같은 프레임에서 투구가 더 남았으면: 같은 플레이어, 다음 투구.
  if (!frameDone) {
    const resetPins = isLast && needsPinReset(fr);
    return {
      ...state,
      phase: 'position',
      params: { ...DEFAULT_PARAMS },
      standing: resetPins ? ALL_UP.slice() : state.standing,
      lastOutcome: null,
    };
  }

  // 프레임 완료 → 다음 플레이어(있으면) 또는 다음 프레임.
  const nextPlayer = state.current + 1;
  if (nextPlayer < state.players.length) {
    return {
      ...state,
      current: nextPlayer,
      frameRolls: [],
      phase: 'announce',
      params: { ...DEFAULT_PARAMS },
      standing: ALL_UP.slice(),
      lastOutcome: null,
      lastResult: null,
    };
  }

  // 모든 플레이어가 이 프레임 완료 → 다음 프레임.
  if (state.frame === 9) {
    return { ...state, phase: 'result', finished: true, lastOutcome: null };
  }

  return {
    ...state,
    current: 0,
    frame: state.frame + 1,
    frameRolls: [],
    phase: 'announce',
    params: { ...DEFAULT_PARAMS },
    standing: ALL_UP.slice(),
    lastOutcome: null,
    lastResult: null,
  };
}

function isFrameDone(fr: number[], isLast: boolean): boolean {
  if (!isLast) {
    if (fr.length === 0) return false;
    if (fr[0] === 10) return true; // 스트라이크
    return fr.length >= 2;
  }
  // 10프레임
  if (fr.length < 2) return false;
  const bonus = fr[0] === 10 || fr[0] + fr[1] === 10;
  return bonus ? fr.length >= 3 : fr.length >= 2;
}

function needsPinReset(fr: number[]): boolean {
  // 10프레임 다음 투구 전에 핀 리셋이 필요한 경우.
  const n = fr.length;
  if (n === 1) return fr[0] === 10; // 스트라이크 후
  if (n === 2) return fr[0] === 10 || fr[0] + fr[1] === 10; // 더블/스페어 후 세 번째
  return false;
}

/** 편의: 현재 플레이어의 스코어카드. */
export function currentScoreCard(state: GameState) {
  return computeScore(state.players[state.current].rolls);
}
