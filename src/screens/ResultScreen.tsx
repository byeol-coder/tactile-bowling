import { useEffect, useMemo, type CSSProperties } from 'react';
import type { GameState } from '@/game/state/gameMachine';
import type { ScoreCard } from '@/game/types';
import { computeScore } from '@/game/scoring/scoring';
import { notifyGameComplete } from '@/host/bridge';

interface Props {
  state: GameState;
  bests: Record<string, number>;
  onRematch: () => void;
  onSamePlayers: () => void;
  onMenu: () => void;
}

function countStrikesSpares(card: ScoreCard) {
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

interface Badge { id: string; label: string; icon: string; }

/** 업적 배지 판정 — 프레임 1~10의 "스트라이크로 시작" 여부만으로 터키/첫 스트라이크를 판정(보너스 유무와 무관). */
function computeBadges(card: ScoreCard, opts: { isNewBest: boolean; isComeback: boolean }): Badge[] {
  const startsWithStrike = card.frames.map((f) => f.rolls[0] === 10);
  const badges: Badge[] = [];

  if (card.total === 300) {
    badges.push({ id: 'perfect-game', label: '퍼펙트 게임', icon: '/assets/badges/perfect-game-128.png' });
  }

  let hasTurkey = false;
  for (let i = 0; i <= 7; i++) {
    if (startsWithStrike[i] && startsWithStrike[i + 1] && startsWithStrike[i + 2]) { hasTurkey = true; break; }
  }
  if (hasTurkey) badges.push({ id: 'turkey', label: '터키(3연속 스트라이크)', icon: '/assets/badges/turkey-128.png' });

  if (startsWithStrike[0]) {
    badges.push({ id: 'first-strike', label: '첫 프레임 스트라이크', icon: '/assets/badges/first-strike-128.png' });
  }

  if (opts.isComeback) {
    badges.push({ id: 'comeback', label: '역전승', icon: '/assets/badges/comeback-128.png' });
  }

  if (opts.isNewBest) {
    badges.push({ id: 'personal-best', label: '개인 최고 기록', icon: '/assets/badges/personal-best-128.png' });
  }

  return badges;
}

const CONFETTI_COLORS = ['var(--player-teal)', 'var(--player-blue)', 'var(--player-amber)', 'var(--player-rose)'];

export function ResultScreen({ state, bests, onRematch, onSamePlayers, onMenu }: Props) {
  const ranked = useMemo(() => {
    const withCards = state.players.map((pr) => ({ pr, card: computeScore(pr.rolls) }));
    return withCards
      .map(({ pr, card }) => ({ pr, card, ...countStrikesSpares(card) }))
      .sort((a, b) => b.total - a.total);
  }, [state.players]);

  // 5프레임(절반) 시점 누적 점수 — 역전승 판정용. 게임이 끝난 뒤라 보너스까지 모두 확정돼 있다.
  const halfLeaderTotal = useMemo(
    () => Math.max(0, ...ranked.map((r) => r.card.frames[4]?.cumulative ?? 0)),
    [ranked],
  );

  useEffect(() => {
    notifyGameComplete(ranked.map((r) => ({ name: r.pr.player.name, total: r.total })));
  }, [ranked]);

  const winner = ranked[0];
  const isPerfect = winner?.total === 300;
  const isStrikeHighlight = !isPerfect && (winner?.strikes ?? 0) > 0;
  const heroImage = isPerfect
    ? "url('/assets/results/perfect-game-celebration-1920x1080.webp')"
    : isStrikeHighlight
      ? "url('/assets/results/strike-celebration-1920x1080.webp')"
      : 'none';

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: heroImage === 'none' ? 0 : 14 }, (_, i) => ({
        left: `${(i * 137) % 100}%`,
        delay: `${(i * 220) % 3000}ms`,
        dur: `${2600 + ((i * 431) % 1600)}ms`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [heroImage],
  );

  return (
    <main className="result anim-fade">
      <div className="result__hero" style={{ '--result-bg-image': heroImage } as CSSProperties}>
        {confettiPieces.length > 0 && (
          <div className="confetti-layer" aria-hidden="true">
            {confettiPieces.map((c, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{ left: c.left, background: c.color, '--confetti-delay': c.delay, '--dur-confetti': c.dur } as CSSProperties}
              />
            ))}
          </div>
        )}
        <h1>경기 종료</h1>
        {isPerfect && <p className="result__sub">퍼펙트 게임 달성! 300점.</p>}
        {!isPerfect && isStrikeHighlight && <p className="result__sub">{winner.pr.player.name}님, 멋진 스트라이크였어요!</p>}
      </div>

      <ol className="result__rank">
        {ranked.map((r, i) => {
          const prevBest = bests[r.pr.player.name] ?? 0;
          const isNewBest = r.total > prevBest;
          const isComeback = i === 0 && (r.card.frames[4]?.cumulative ?? 0) < halfLeaderTotal;
          const badges = computeBadges(r.card, { isNewBest, isComeback });
          return (
            <li key={r.pr.player.id} className={`result__row ${i === 0 ? 'is-first' : ''}`}>
              <span className="result__medal" aria-hidden="true">{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div className="result__pname">
                  <span className={`dot dot--${r.pr.player.colorId}`} aria-hidden="true" /> {r.pr.player.name}
                  {isNewBest && <span className="result__best"> · 개인 최고 기록!</span>}
                </div>
                <div className="result__stats">스트라이크 {r.strikes} · 스페어 {r.spares} · 최고 프레임 +{r.best}</div>
                {badges.length > 0 && (
                  <div className="result__badges">
                    {badges.map((b) => (
                      <span className="badge" key={b.id}>
                        <img className="badge__icon" src={b.icon} alt="" aria-hidden="true" />
                        <span className="badge__label">{b.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="result__ptotal">{r.total}</span>
              <span className="sr-only">
                {i + 1}위 {r.pr.player.name}, {r.total}점, 스트라이크 {r.strikes}회, 스페어 {r.spares}회
                {badges.length > 0 ? `, 획득 업적: ${badges.map((b) => b.label).join(', ')}` : ''}.
              </span>
            </li>
          );
        })}
      </ol>

      <div className="form__actions form__actions--result">
        <button type="button" className="btn btn--ghost" onClick={onMenu}>모드 선택</button>
        <button type="button" className="btn" onClick={onSamePlayers}>같은 플레이어로 재경기</button>
        <button type="button" className="btn btn--primary btn--lg" onClick={onRematch}>다시 하기</button>
      </div>
    </main>
  );
}
