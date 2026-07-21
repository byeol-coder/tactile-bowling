import { useMemo } from 'react';
import type { PinState, ThrowParams } from '@/game/types';
import { PIN_LAYOUT, ballXAtDepth, type ThrowResult } from '@/game/physics/resolve';

interface LaneProps {
  standing: PinState;
  params: ThrowParams;
  phase: string;
  lastResult: ThrowResult | null;
  rollT: number; // 0~1 공 이동 진행
}

// 원근 화면 매핑
const yFront = 150;
const yBack = 62;
const pinY = (depth: number) => yFront - depth * (yFront - yBack);
const pinSpread = (depth: number) => 82 - depth * 26;
const pinX = (x: number, depth: number) => 200 + x * pinSpread(depth);

const ballScreenX = (x: number) => 200 + x * 118;
const ballScreenY = (t: number) => 372 - t * (372 - yFront);

export function Lane({ standing, params, phase, lastResult, rollT }: LaneProps) {
  const aimPts = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(`${ballScreenX(ballXAtDepth(params, t)).toFixed(1)},${ballScreenY(t).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [params]);

  let bx = ballScreenX(params.position);
  let by = 372;
  let ballDepth = 0;
  if (phase === 'rolling' && lastResult) {
    ballDepth = Math.min(1, rollT);
    bx = ballScreenX(ballXAtDepth(params, ballDepth));
    by = ballScreenY(ballDepth);
  }

  const ballSize = 36 - ballDepth * 19;
  const showAim = phase === 'position' || phase === 'angle' || phase === 'spin' || phase === 'power';

  return (
    <svg viewBox="0 0 400 420" className={`lane-svg lane-svg--${phase}`} role="img" aria-label="볼링 레인 장면">
      <image href="/assets/play-lane-backdrop.svg" x="0" y="0" width="400" height="420" preserveAspectRatio="none" />

      {/* 예상 궤적 */}
      {showAim && (
        <>
          <polyline
            points={aimPts}
            fill="none"
            stroke="rgba(5, 9, 18, 0.5)"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.72"
          />
          <polyline
            points={aimPts}
            fill="none"
            stroke="var(--accent-teal)"
            strokeWidth="3.25"
            strokeDasharray="5 7"
            strokeLinecap="round"
            opacity="0.96"
          />
        </>
      )}

      {/* 핀 */}
      {PIN_LAYOUT.map((p, i) => {
        const cx = pinX(p.x, p.y);
        const cy = pinY(p.y);
        const w = 17 - p.y * 4;
        const h = w * 1.75;
        const isStanding = standing[i];
        return (
          <g
            key={i}
            className={isStanding ? 'lane-pin is-standing' : 'lane-pin is-down'}
            opacity={isStanding ? 1 : 0.38}
            transform={isStanding ? undefined : `rotate(68 ${cx} ${cy})`}
          >
            <image
              href="/assets/bowling-pin.svg"
              x={cx - w / 2}
              y={cy - h * 0.76}
              width={w}
              height={h}
              preserveAspectRatio="xMidYMid meet"
            />
            <circle cx={cx + w * 0.52} cy={cy - h * 0.52} r="4.3" fill="rgba(9,14,24,.88)" stroke="rgba(255,255,255,.45)" strokeWidth="0.6" />
            <text x={cx + w * 0.52} y={cy - h * 0.52 + 1.8} fontSize="4.5" fontWeight="800" textAnchor="middle" fill="var(--text-hi)">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* 실제 궤적(투구 후) */}
      {phase === 'rolling' && lastResult && (
        <polyline
          points={lastResult.path.map((pt) => `${ballScreenX(pt.x).toFixed(1)},${ballScreenY(pt.y).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--accent-amber)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.82"
        />
      )}

      {/* 볼링공 */}
      <ellipse cx={bx} cy={by + ballSize * 0.34} rx={ballSize * 0.45} ry={ballSize * 0.14} fill="rgba(3,7,14,.48)" />
      <image
        href="/assets/bowling-ball.svg"
        x={bx - ballSize / 2}
        y={by - ballSize / 2}
        width={ballSize}
        height={ballSize}
        preserveAspectRatio="xMidYMid meet"
        className="lane-ball"
      />
    </svg>
  );
}