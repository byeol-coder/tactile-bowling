import { computeScore } from '@/game/scoring/scoring';
import type { PlayerRuntime } from '@/game/state/gameMachine';
import './scoreboard.css';

interface ScoreboardProps {
  players: PlayerRuntime[];
  currentPlayer: number;
  currentFrame: number;
}

/** 프레임의 투구 기호(X / - 숫자)를 표준 볼링 표기로 변환. */
function frameSymbols(rolls: number[], isLast: boolean): string[] {
  const out: string[] = [];
  if (isLast) {
    rolls.forEach((r, i) => {
      if (r === 10) out.push('X');
      else if (i > 0 && rolls[i - 1] !== 10 && rolls[i - 1] + r === 10) out.push('/');
      else out.push(r === 0 ? '-' : String(r));
    });
    return out;
  }
  if (rolls[0] === 10) return ['', 'X'];
  const a = rolls[0];
  const b = rolls[1];
  const s0 = a === undefined ? '' : a === 0 ? '-' : String(a);
  const s1 = b === undefined ? '' : a + b === 10 ? '/' : b === 0 ? '-' : String(b);
  return [s0, s1];
}

export function Scoreboard({ players, currentPlayer, currentFrame }: ScoreboardProps) {
  return (
    <div className="scoreboard panel area-board">
      <h2 className="scoreboard__title">점수표</h2>
      <div className="scoreboard__scroll">
        <table className="scoreboard__table">
          <caption className="sr-only">플레이어별 프레임 점수. 각 프레임의 투구 결과와 누적 점수.</caption>
          <thead>
            <tr>
              <th scope="col" className="scoreboard__namecol">플레이어</th>
              {Array.from({ length: 10 }, (_, f) => (
                <th key={f} scope="col" aria-current={f === currentFrame ? 'step' : undefined}>
                  {f + 1}
                </th>
              ))}
              <th scope="col">합계</th>
            </tr>
          </thead>
          <tbody>
            {players.map((pr, pi) => {
              const card = computeScore(pr.rolls);
              return (
                <tr key={pr.player.id} aria-current={pi === currentPlayer ? 'true' : undefined} className={pi === currentPlayer ? 'is-current' : ''}>
                  <th scope="row" className="scoreboard__namecol">
                    <span className={`dot dot--${pr.player.colorId}`} aria-hidden="true" />
                    <span className="scoreboard__pnum">{pi + 1}</span> {pr.player.name}
                  </th>
                  {card.frames.map((frame, f) => {
                    const syms = frameSymbols(frame.rolls, f === 9);
                    return (
                      <td key={f} className={f === 9 ? 'is-last' : ''}>
                        <span className="scoreboard__rolls" aria-hidden="true">
                          {syms.map((s, si) => (
                            <span key={si} className="scoreboard__roll">{s}</span>
                          ))}
                        </span>
                        <span className="scoreboard__cum">{frame.cumulative ?? ''}</span>
                        <span className="sr-only">
                          {f + 1}프레임 {syms.filter(Boolean).join(', ') || '미투구'}
                          {frame.cumulative != null ? `, 누적 ${frame.cumulative}점` : ''}
                        </span>
                      </td>
                    );
                  })}
                  <td className="scoreboard__total">{card.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
