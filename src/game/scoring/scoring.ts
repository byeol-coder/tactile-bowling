// 정식 10프레임 볼링 점수 계산 — 순수 함수. UI/렌더와 완전히 분리.
// 입력: 투구별 쓰러진 핀 수(rolls). 출력: 프레임 단위 누적 점수 + 총점 + 완료 여부.

import type { Frame, FrameKind, Roll, ScoreCard } from '@/game/types';

export const MAX_PINS = 10;
export const FRAME_COUNT = 10;

export class InvalidRollError extends Error {}

/** 하나의 투구가 유효한지 검사(0~10, 정수). 게임 진행 중 잘못된 입력 방지. */
export function isValidRoll(pins: number): boolean {
  return Number.isInteger(pins) && pins >= 0 && pins <= MAX_PINS;
}

/**
 * 이미 기록된 rolls 위에 새 투구를 놓을 때, 허용되는 최대 핀 수를 반환.
 * 마지막 프레임의 보너스 투구 로직까지 반영한다. rolls 가 이미 완료된 게임이면 0.
 */
export function maxAllowedNext(rolls: Roll[]): number {
  const frames = splitFrames(rolls);
  if (frames.complete) return 0;

  // 현재 진행 중인(미완료) 프레임 인덱스를 찾는다.
  const idx = frames.frames.findIndex((f) => f.kind === 'incomplete' || f.kind === 'empty');
  const frameIndex = idx === -1 ? frames.frames.length : idx;
  const isLast = frameIndex === FRAME_COUNT - 1;
  const current = idx === -1 ? { rolls: [] as number[] } : frames.frames[idx];
  const r = current.rolls;

  if (!isLast) {
    // 일반 프레임: 두 투구 합이 10을 넘을 수 없다.
    if (r.length === 0) return MAX_PINS;
    return MAX_PINS - r[0];
  }

  // 10프레임: 최대 3투구.
  if (r.length === 0) return MAX_PINS;
  if (r.length === 1) {
    if (r[0] === MAX_PINS) return MAX_PINS; // 스트라이크 후 새 핀 세트
    return MAX_PINS - r[0]; // 스페어 시도
  }
  if (r.length === 2) {
    // 세 번째 투구는 스트라이크 또는 스페어를 완성한 경우에만 존재
    if (r[0] === MAX_PINS) {
      // 첫 투구 스트라이크. 둘째 투구가 스트라이크였다면 새 세트, 아니면 남은 핀.
      return r[1] === MAX_PINS ? MAX_PINS : MAX_PINS - r[1];
    }
    return MAX_PINS; // 스페어 완성 후 보너스는 새 세트
  }
  return 0;
}

/** rolls 를 프레임 단위로 분해하고 kind 를 판정(누적 점수는 아직 계산 안 함). */
function splitFrames(rolls: Roll[]): { frames: Frame[]; complete: boolean } {
  const frames: Frame[] = [];
  let i = 0;

  for (let f = 0; f < FRAME_COUNT; f++) {
    const isLast = f === FRAME_COUNT - 1;

    if (isLast) {
      const rest = rolls.slice(i);
      frames.push({ rolls: rest, cumulative: null, kind: lastFrameKind(rest) });
      i += rest.length;
      break;
    }

    if (rolls[i] === undefined) {
      frames.push({ rolls: [], cumulative: null, kind: 'empty' });
      continue;
    }

    if (rolls[i] === MAX_PINS) {
      frames.push({ rolls: [rolls[i]], cumulative: null, kind: 'strike' });
      i += 1;
      continue;
    }

    const first = rolls[i];
    const second = rolls[i + 1];
    if (second === undefined) {
      frames.push({ rolls: [first], cumulative: null, kind: 'incomplete' });
      i += 1;
      continue;
    }
    const kind: FrameKind = first + second === MAX_PINS ? 'spare' : 'open';
    frames.push({ rolls: [first, second], cumulative: null, kind });
    i += 2;
  }

  const complete = isGameComplete(frames);
  return { frames, complete };
}

function lastFrameKind(rest: Roll[]): FrameKind {
  if (rest.length === 0) return 'empty';
  if (rest.length === 1) return 'incomplete';
  const [a, b] = rest;
  if (a === MAX_PINS) {
    // 스트라이크로 시작 → 보너스 2투구 필요
    return rest.length >= 3 ? 'strike' : 'incomplete';
  }
  if (a + b === MAX_PINS) {
    return rest.length >= 3 ? 'spare' : 'incomplete';
  }
  return rest.length >= 2 ? 'open' : 'incomplete';
}

function isGameComplete(frames: Frame[]): boolean {
  if (frames.length < FRAME_COUNT) return false;
  const last = frames[FRAME_COUNT - 1];
  const r = last.rolls;
  if (r.length < 2) return false;
  const needsBonus = r[0] === MAX_PINS || r[0] + r[1] === MAX_PINS;
  return needsBonus ? r.length === 3 : r.length === 2;
}

/** 다음 n개 투구의 핀 합(보너스 계산용). flatRolls 는 전체 투구 시퀀스. */
function bonusSum(flat: Roll[], from: number, n: number): number | null {
  let sum = 0;
  let taken = 0;
  for (let k = from; k < flat.length && taken < n; k++, taken++) {
    sum += flat[k];
  }
  return taken === n ? sum : null; // 아직 보너스 투구가 부족하면 미확정(null)
}

/**
 * 전체 rolls 로 스코어카드 계산. 미확정 프레임의 cumulative 는 null.
 * total 은 확정 가능한 최신 누적값.
 */
export function computeScore(rolls: Roll[]): ScoreCard {
  // 입력 검증
  for (const r of rolls) {
    if (!isValidRoll(r)) throw new InvalidRollError(`유효하지 않은 핀 수: ${r}`);
  }

  const { frames, complete } = splitFrames(rolls);
  let running = 0;
  let lastConfirmed = 0;
  let i = 0; // flat rolls 포인터

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const isLast = f === FRAME_COUNT - 1;

    if (frame.kind === 'empty') {
      frame.cumulative = null;
      continue;
    }

    let frameScore: number | null = null;

    if (isLast) {
      // 10프레임: 굴린 투구 합이 곧 점수(보너스 규칙이 내장됨).
      if (frame.rolls.length >= 2) {
        const need = frame.rolls[0] === MAX_PINS || frame.rolls[0] + frame.rolls[1] === MAX_PINS ? 3 : 2;
        frameScore = frame.rolls.length >= need ? frame.rolls.reduce((a, b) => a + b, 0) : null;
      }
      i += frame.rolls.length;
    } else if (frame.kind === 'strike') {
      const bonus = bonusSum(rolls, i + 1, 2);
      frameScore = bonus === null ? null : MAX_PINS + bonus;
      i += 1;
    } else if (frame.kind === 'spare') {
      const bonus = bonusSum(rolls, i + 2, 1);
      frameScore = bonus === null ? null : MAX_PINS + bonus;
      i += 2;
    } else if (frame.kind === 'open') {
      frameScore = frame.rolls[0] + frame.rolls[1];
      i += 2;
    } else {
      // incomplete (일반 프레임 첫 투구만)
      i += frame.rolls.length;
    }

    if (frameScore === null) {
      frame.cumulative = null;
    } else {
      running += frameScore;
      frame.cumulative = running;
      lastConfirmed = running;
    }
  }

  return { frames, total: lastConfirmed, complete };
}

/** 현재 rolls 기준으로 게임이 완전히 끝났는지. */
export function isComplete(rolls: Roll[]): boolean {
  return splitFrames(rolls).complete;
}
