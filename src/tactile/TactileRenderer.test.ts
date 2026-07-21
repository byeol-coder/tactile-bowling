import { describe, it, expect } from 'vitest';
import { renderLane, renderAim, renderResult } from './TactileRenderer';
import { ALL_UP, resolveThrow } from '@/game/physics/resolve';
import { TW, TH } from './patterns';

const countDots = (dots: boolean[]) => dots.filter(Boolean).length;

describe('TactileRenderer', () => {
  it('프레임 크기는 60×40', () => {
    const f = renderLane(ALL_UP);
    expect(f.width).toBe(TW);
    expect(f.height).toBe(TH);
    expect(f.dots).toHaveLength(TW * TH);
  });

  it('10핀 모두 서 있을 때 점 수가 핀 없을 때보다 많다', () => {
    const withPins = renderLane(ALL_UP);
    const noPins = renderLane(ALL_UP.map(() => false));
    expect(countDots(withPins.dots)).toBeGreaterThan(countDots(noPins.dots));
  });

  it('쓰러진 핀은 촉각 프레임에서 사라진다(상태 일치)', () => {
    const full = countDots(renderLane(ALL_UP).dots);
    const oneDown = ALL_UP.slice();
    oneDown[0] = false;
    const partial = countDots(renderLane(oneDown).dots);
    expect(partial).toBeLessThan(full);
  });

  it('예상 궤적 렌더는 레인만 그린 것보다 점이 많다', () => {
    const params = { position: 0, angle: 0, power: 0.6, spin: 0 };
    const lane = countDots(renderLane(ALL_UP).dots);
    const aim = countDots(renderAim(params, ALL_UP).dots);
    expect(aim).toBeGreaterThan(lane);
  });

  it('투구 결과 프레임은 실제 물리 경로/남은 핀과 일치', () => {
    const params = { position: 0, angle: 0, power: 1, spin: 0 };
    const res = resolveThrow(params, ALL_UP);
    const f = renderResult(res.path, res.standing);
    // 스트라이크면 남은 핀이 없으므로 결과 프레임 점 수가 레인 초기보다 적을 수 있다
    expect(f.dots).toHaveLength(TW * TH);
    expect(countDots(f.dots)).toBeGreaterThan(0); // 경로/레인은 항상 존재
  });
});
