import type { PlayerRuntime } from '@/game/state/gameMachine';
import { computeScore } from '@/game/scoring/scoring';
import './hud.css';

interface HudProps {
  players: PlayerRuntime[];
  current: number;
  frame: number;
  frameRollCount: number;
}

export function Hud({ players, current, frame, frameRollCount }: HudProps) {
  const player = players[current];
  const total = computeScore(player.rolls).total;
  return (
    <header className="hud panel area-hud">
      <div className="hud__block">
        <span className="eyebrow">프레임</span>
        <span className="hud__value">{frame + 1}<span className="hud__sub"> / 10</span></span>
      </div>
      <div className="hud__block">
        <span className="eyebrow">투구</span>
        <span className="hud__value">{frameRollCount + 1}</span>
      </div>
      <div className="hud__block hud__player">
        <span className="eyebrow">현재 플레이어</span>
        <span className="hud__value">
          <span className={`dot dot--${player.player.colorId}`} aria-hidden="true" />
          <span className="hud__pnum">P{current + 1}</span> {player.player.name}
        </span>
      </div>
      <div className="hud__block hud__score">
        <span className="eyebrow">점수</span>
        <span className="hud__value hud__value--big">{total}</span>
      </div>
    </header>
  );
}
