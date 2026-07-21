import { describe, it, expect } from 'vitest';
import { createGame, reduce, type GameState, type Action } from './gameMachine';
import { computeScore } from '@/game/scoring/scoring';
import type { Player, ThrowParams } from '@/game/types';

const P = (id: string, name: string): Player => ({
  id,
  name,
  colorId: 'teal',
  iconId: 'circle',
  toneId: 0,
  device: 'keyboard',
  best: null,
});

function dispatch(s: GameState, a: Action) {
  return reduce(s, a);
}

/** power 단계까지 진행. */
function toPower(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== 'power' && guard < 10) {
    s = dispatch(s, { type: 'nextPhase' });
    guard++;
  }
  return s;
}

/** 하나의 완전한 투구(단계 진행 → 파라미터 세팅 → 투구 → 정착 → 턴 확정). */
function playThrow(state: GameState, params: ThrowParams): GameState {
  let s = toPower(state);
  (['position', 'angle', 'spin', 'power'] as (keyof ThrowParams)[]).forEach((k) => {
    s = dispatch(s, { type: 'set', key: k, value: params[k] });
  });
  s = dispatch(s, { type: 'throw' });
  s = dispatch(s, { type: 'settle' });
  s = dispatch(s, { type: 'confirmTurn' });
  return s;
}

const STRIKE: ThrowParams = { position: 0, angle: 0, power: 1, spin: 0 };
const GUTTER: ThrowParams = { position: 1, angle: 0, power: 0.5, spin: 0 };

describe('gameMachine — 흐름', () => {
  it('스트라이크 투구는 outcome=strike 이고 프레임이 진행된다', () => {
    let s = toPower(createGame([P('a', '별')]));
    (['position', 'angle', 'spin', 'power'] as (keyof ThrowParams)[]).forEach((k) => {
      s = dispatch(s, { type: 'set', key: k, value: STRIKE[k] });
    });
    s = dispatch(s, { type: 'throw' });
    s = dispatch(s, { type: 'settle' });
    expect(s.lastResult?.pinsDown).toBe(10);
    expect(s.lastOutcome).toBe('strike');
  });

  it('거터(레인 밖) 투구는 0핀이며 outcome=gutter', () => {
    let s = toPower(createGame([P('a', '별')]));
    (['position', 'angle', 'spin', 'power'] as (keyof ThrowParams)[]).forEach((k) => {
      s = dispatch(s, { type: 'set', key: k, value: GUTTER[k] });
    });
    s = dispatch(s, { type: 'throw' });
    s = dispatch(s, { type: 'settle' });
    expect(s.lastResult?.gutter).toBe(true);
    expect(s.lastResult?.pinsDown).toBe(0);
    expect(s.lastOutcome).toBe('gutter');
  });

  it('싱글 플레이 전 프레임 스트라이크 → 게임 종료 & 유효한 스코어카드', () => {
    let s = createGame([P('a', '별')]);
    let guard = 0;
    while (!s.finished && guard < 40) {
      s = playThrow(s, STRIKE);
      guard++;
    }
    expect(s.finished).toBe(true);
    const card = computeScore(s.players[0].rolls);
    expect(card.complete).toBe(true);
    expect(card.total).toBeGreaterThan(0);
  });

  it('2인 로컬 멀티: 프레임마다 턴이 교대되고 각자 독립 점수', () => {
    let s = createGame([P('a', '별'), P('b', '채빈')]);
    const first = s.current;
    s = playThrow(s, GUTTER); // 플레이어 A 첫 투구(0핀, 프레임 미완)
    // 거터는 프레임 미완 → 같은 플레이어 유지
    expect(s.current).toBe(first);
    s = playThrow(s, GUTTER); // A 두 번째 → 프레임 완료 → 다음 플레이어
    expect(s.current).toBe(1);
    let guard = 0;
    while (!s.finished && guard < 100) {
      s = playThrow(s, GUTTER);
      guard++;
    }
    expect(s.finished).toBe(true);
    expect(s.players).toHaveLength(2);
    expect(computeScore(s.players[0].rolls).complete).toBe(true);
    expect(computeScore(s.players[1].rolls).complete).toBe(true);
  });

  it('Escape(prevPhase)로 이전 단계로 돌아갈 수 있다', () => {
    let s = createGame([P('a', '별')]);
    s = dispatch(s, { type: 'nextPhase' }); // announce → position
    s = dispatch(s, { type: 'nextPhase' }); // position → angle
    expect(s.phase).toBe('angle');
    s = dispatch(s, { type: 'prevPhase' });
    expect(s.phase).toBe('position');
  });
});
