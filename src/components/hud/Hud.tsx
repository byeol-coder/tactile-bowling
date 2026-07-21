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
  const frameText = String(frame + 1).padStart(2, '0');

  return (
    <header className="hud area-hud" aria-label={`현재 ${player.player.name}, ${frame + 1}프레임, 점수 ${total}점`}>
      <div className="hud__player">
        <span className={`hud__avatar dot--${player.player.colorId}`} aria-hidden="true">
          {current + 1}
        </span>
        <span className="hud__player-copy">
          <span className="hud__label">현재 플레이어</span>
          <strong>{player.player.name}</strong>
        </span>
      </div>

      <div className="hud__progress" aria-label={`${frame + 1}프레임 ${frameRollCount + 1}번째 투구`}>
        <span className="hud__metric">
          <span className="hud__label">FRAME</span>
          <strong>{frameText}<small>/10</small></strong>
        </span>
        <span className="hud__divider" aria-hidden="true" />
        <span className="hud__metric">
          <span className="hud__label">BALL</span>
          <strong>{frameRollCount + 1}</strong>
        </span>
      </div>

      <div className="hud__score">
        <span className="hud__label">SCORE</span>
        <strong>{total}</strong>
      </div>
    </header>
  );
}