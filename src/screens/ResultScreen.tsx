import { useEffect, useMemo } from 'react';
import type { GameState } from '@/game/state/gameMachine';
import { computeScore } from '@/game/scoring/scoring';
import { notifyGameComplete } from '@/host/bridge';

interface Props {
  state: GameState;
  bests: Record<string, number>;
  onRematch: () => void;
  onSamePlayers: () => void;
  onMenu: () => void;
}

function countStrikesSpares(rolls: number[]) {
  const card = computeScore(rolls);
  let strikes = 0;
  let spares = 0;
  let best = 0;
  card.frames.forEach((f, i) => {
    const prev = i === 0 ? 0 : (card.frames[i - 1].cumulative ?? 0);
    const gain = (f.cumulative ?? prev) - prev;
    best = Math.max(best, gain);
    if (i < 9) {
      if (f.rolls[0] === 10) strikes++;
      else if (f.rolls.length >= 2 && f.rolls[0] + f.rolls[1] === 10) spares++;
    } else {
      f.rolls.forEach((r, ri) => {
        if (r === 10) strikes++;
        else if (ri > 0 && f.rolls[ri - 1] !== 10 && f.rolls[ri - 1] + r === 10) spares++;
      });
    }
  });
  return { total: card.total, strikes, spares, best };
}

export function ResultScreen({ state, bests, onRematch, onSamePlayers, onMenu }: Props) {
  const ranked = useMemo(() => {
    return state.players
      .map((pr) => ({ pr, ...countStrikesSpares(pr.rolls) }))
      .sort((a, b) => b.total - a.total);
  }, [state.players]);

  useEffect(() => {
    notifyGameComplete(ranked.map((r) => ({ name: r.pr.player.name, total: r.total })));
  }, [ranked]);

  return (
    <main className="result anim-fade">
      <h1>경기 종료</h1>
      <ol className="result__rank">
        {ranked.map((r, i) => {
          const prevBest = bests[r.pr.player.name] ?? 0;
          const isNewBest = r.total > prevBest;
          return (
            <li key={r.pr.player.id} className={`result__row ${i === 0 ? 'is-first' : ''}`}>
              <span className="result__medal" aria-hidden="true">{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div className="result__pname">
                  <span className={`dot dot--${r.pr.player.colorId}`} aria-hidden="true" /> {r.pr.player.name}
                  {isNewBest && <span className="result__best"> · 개인 최고 기록!</span>}
                </div>
                <div className="result__stats">스트라이크 {r.strikes} · 스페어 {r.spares} · 최고 프레임 +{r.best}</div>
              </div>
              <span className="result__ptotal">{r.total}</span>
              <span className="sr-only">
                {i + 1}위 {r.pr.player.name}, {r.total}점, 스트라이크 {r.strikes}회, 스페어 {r.spares}회{isNewBest ? ', 개인 최고 기록 갱신' : ''}.
              </span>
            </li>
          );
        })}
      </ol>

      <div className="form__actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn--ghost" onClick={onMenu}>모드 선택</button>
        <button type="button" className="btn" onClick={onSamePlayers}>같은 플레이어로 재경기</button>
        <button type="button" className="btn btn--primary btn--lg" onClick={onRematch}>다시 하기</button>
      </div>
    </main>
  );
}
