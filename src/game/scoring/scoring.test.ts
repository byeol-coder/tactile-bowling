import { describe, it, expect } from 'vitest';
import {
  computeScore,
  isComplete,
  isValidRoll,
  maxAllowedNext,
  InvalidRollError,
} from './scoring';

const rep = (n: number, v: number) => Array.from({ length: n }, () => v);

describe('computeScore — 정식 볼링 규칙', () => {
  it('전 투구 거터 → 0점', () => {
    const card = computeScore(rep(20, 0));
    expect(card.total).toBe(0);
    expect(card.complete).toBe(true);
  });

  it('모든 프레임 1점 → 20점', () => {
    const card = computeScore(rep(20, 1));
    expect(card.total).toBe(20);
    expect(card.complete).toBe(true);
  });

  it('스페어 후 일반 투구 → 보너스 반영', () => {
    // [5,5](스페어) → 10 + 다음 1투구(3) = 13, [3,4] → 7 → 누적 20
    const card = computeScore([5, 5, 3, 4]);
    expect(card.frames[0].cumulative).toBe(13);
    expect(card.frames[0].kind).toBe('spare');
    expect(card.frames[1].cumulative).toBe(20);
    expect(card.total).toBe(20);
  });

  it('스트라이크 후 두 번의 일반 투구 → 보너스 반영', () => {
    // [10] → 10 + (3+4) = 17, [3,4] → 7 → 누적 24
    const card = computeScore([10, 3, 4]);
    expect(card.frames[0].cumulative).toBe(17);
    expect(card.frames[0].kind).toBe('strike');
    expect(card.frames[1].cumulative).toBe(24);
    expect(card.total).toBe(24);
  });

  it('연속 스트라이크 → 첫 프레임 30점', () => {
    const card = computeScore([10, 10, 10]);
    expect(card.frames[0].cumulative).toBe(30);
  });

  it('퍼펙트 게임(스트라이크 12회) → 300점', () => {
    const card = computeScore(rep(12, 10));
    expect(card.total).toBe(300);
    expect(card.frames[9].cumulative).toBe(300);
    expect(card.complete).toBe(true);
  });

  it('10프레임 스페어 + 보너스', () => {
    // 9프레임 거터, 10프레임 [5,5,7] → 17
    const rolls = [...rep(18, 0), 5, 5, 7];
    const card = computeScore(rolls);
    expect(card.frames[9].rolls).toEqual([5, 5, 7]);
    expect(card.frames[9].kind).toBe('spare');
    expect(card.total).toBe(17);
    expect(card.complete).toBe(true);
  });

  it('10프레임 스트라이크 + 보너스 2투구', () => {
    // 9프레임 거터, 10프레임 [10,5,3] → 18
    const rolls = [...rep(18, 0), 10, 5, 3];
    const card = computeScore(rolls);
    expect(card.frames[9].rolls).toEqual([10, 5, 3]);
    expect(card.frames[9].kind).toBe('strike');
    expect(card.total).toBe(18);
    expect(card.complete).toBe(true);
  });

  it('미확정 프레임 점수는 null', () => {
    const card = computeScore([10]); // 보너스 투구 아직 없음
    expect(card.frames[0].cumulative).toBeNull();
    expect(card.total).toBe(0);
    expect(card.complete).toBe(false);
  });

  it('유효하지 않은 핀 수 입력 → 예외', () => {
    expect(() => computeScore([11])).toThrow(InvalidRollError);
    expect(() => computeScore([-1])).toThrow(InvalidRollError);
    expect(() => computeScore([3.5])).toThrow(InvalidRollError);
  });

  it('일반적인 혼합 게임 누적 검증', () => {
    // 위키 표준 예시 유사: 다양한 프레임
    const rolls = [1, 4, 4, 5, 6, 4, 5, 5, 10, 0, 1, 7, 3, 6, 4, 10, 2, 8, 6];
    const card = computeScore(rolls);
    expect(card.total).toBe(133);
    expect(card.complete).toBe(true);
  });
});

describe('isValidRoll', () => {
  it('0~10 정수만 허용', () => {
    expect(isValidRoll(0)).toBe(true);
    expect(isValidRoll(10)).toBe(true);
    expect(isValidRoll(11)).toBe(false);
    expect(isValidRoll(-1)).toBe(false);
    expect(isValidRoll(2.5)).toBe(false);
  });
});

describe('maxAllowedNext — 잘못된 투구 입력 방지', () => {
  it('빈 프레임 첫 투구는 최대 10', () => {
    expect(maxAllowedNext([])).toBe(10);
  });
  it('첫 투구 후 남은 핀만 허용', () => {
    expect(maxAllowedNext([3])).toBe(7);
  });
  it('스트라이크 후 새 프레임은 다시 10', () => {
    expect(maxAllowedNext([10])).toBe(10);
  });
  it('완료된 게임은 0', () => {
    expect(maxAllowedNext(rep(20, 0))).toBe(0);
  });
  it('10프레임 스트라이크 후 보너스도 최대 10', () => {
    expect(maxAllowedNext([...rep(18, 0), 10])).toBe(10);
    expect(maxAllowedNext([...rep(18, 0), 10, 10])).toBe(10);
  });
  it('10프레임 스페어 시도 시 남은 핀', () => {
    expect(maxAllowedNext([...rep(18, 0), 4])).toBe(6);
  });
});

describe('isComplete', () => {
  it('9프레임까지는 미완료', () => {
    expect(isComplete(rep(18, 0))).toBe(false);
  });
  it('보너스 없는 오픈 프레임으로 종료', () => {
    expect(isComplete(rep(20, 0))).toBe(true);
  });
  it('10프레임 스트라이크는 보너스 2개 필요', () => {
    expect(isComplete([...rep(18, 0), 10, 5])).toBe(false);
    expect(isComplete([...rep(18, 0), 10, 5, 3])).toBe(true);
  });
});
