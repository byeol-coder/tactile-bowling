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
    rolls.forEach((roll, index) => {
      if (roll === 10) out.push('X');
      else if (index > 0 && rolls[index - 1] !== 10 && rolls[index - 1] + roll === 10) out.push('/');
      else out.push(roll === 0 ? '-' : String(roll));
    });
    return out;
  }
  if (rolls[0] === 10) return ['', 'X'];
  const first = rolls[0];
  const second = rolls[1];
  const firstSymbol = first === undefined ? '' : first === 0 ? '-' : String(first);
  const secondSymbol = second === undefined ? '' : first + second === 10 ? '/' : second === 0 ? '-' : String(second);
  return [firstSymbol, secondSymbol];
}

export function Scoreboard({ players, currentPlayer, currentFrame }: ScoreboardProps) {
  const currentTotal = computeScore(players[currentPlayer].rolls).total;

  return (
    <section className="scoreboard area-board" aria-labelledby="scoreboard-title">
      <div className="scoreboard__head">
        <span>
          <small>10 FRAME SCORECARD</small>
          <h2 className="scoreboard__title" id="scoreboard-title">전체 점수</h2>
        </span>
        <span className="scoreboard__current">
          <small>현재</small>
          <strong>{currentTotal}</strong>
        </span>
      </div>
      <div className="scoreboard__scroll">
        <table className="scoreboard__table">
          <caption className="sr-only">플레이어별 프레임 점수. 각 프레임의 투구 결과와 누적 점수.</caption>
          <thead>
            <tr>
              <th scope="col" className="scoreboard__namecol">플레이어</th>
              {Array.from({ length: 10 }, (_, frame) => (
                <th key={frame} scope="col" aria-current={frame === currentFrame ? 'step' : undefined}>
                  {frame + 1}
                </th>
              ))}
              <th scope="col">합계</th>
            </tr>
          </thead>
          <tbody>
            {players.map((playerRuntime, playerIndex) => {
              const card = computeScore(playerRuntime.rolls);
              return (
                <tr
                  key={playerRuntime.player.id}
                  aria-current={playerIndex === currentPlayer ? 'true' : undefined}
                  className={playerIndex === currentPlayer ? 'is-current' : ''}
                >
                  <th scope="row" className="scoreboard__namecol">
                    <span className={`dot dot--${playerRuntime.player.colorId}`} aria-hidden="true" />
                    <span className="scoreboard__pnum">P{playerIndex + 1}</span> {playerRuntime.player.name}
                  </th>
                  {card.frames.map((frame, frameIndex) => {
                    const symbols = frameSymbols(frame.rolls, frameIndex === 9);
                    return (
                      <td key={frameIndex} className={frameIndex === 9 ? 'is-last' : ''}>
                        <span className="scoreboard__rolls" aria-hidden="true">
                          {symbols.map((symbol, symbolIndex) => (
                            <span key={symbolIndex} className="scoreboard__roll">{symbol}</span>
                          ))}
                        </span>
                        <span className="scoreboard__cum">{frame.cumulative ?? ''}</span>
                        <span className="sr-only">
                          {frameIndex + 1}프레임 {symbols.filter(Boolean).join(', ') || '미투구'}
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
    </section>
  );
}