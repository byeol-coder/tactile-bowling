import { useMemo } from 'react';
import type { PinState, PlayerColorId, ThrowParams } from '@/game/types';
import { PIN_LAYOUT, ballXAtDepth, type ThrowResult } from '@/game/physics/resolve';

interface LaneProps {
  standing: PinState;
  params: ThrowParams;
  phase: string;
  lastResult: ThrowResult | null;
  rollT: number; // 0~1 공 이동 진행
  ballColorId?: PlayerColorId; // 현재 플레이어가 고른 공 색(선택) — SVG 채우기 색상에 반영
}

const BALL_FILL: Record<PlayerColorId, string> = {
  teal: 'var(--player-teal)',
  blue: 'var(--player-blue)',
  amber: 'var(--player-amber)',
  rose: 'var(--player-rose)',
};

// 원근 화면 매핑
const yFront = 150;
const yBack = 62;
const pinY = (depth: number) => yFront - depth * (yFront - yBack);
const pinSpread = (depth: number) => 82 - depth * 26;
const pinX = (x: number, depth: number) => 200 + x * pinSpread(depth);

const ballScreenX = (x: number) => 200 + x * 118;
const ballScreenY = (t: number) => 372 - t * (372 - yFront);

export function Lane({ standing, params, phase, lastResult, rollT, ballColorId }: LaneProps) {
  const aimPts = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(`${ballScreenX(ballXAtDepth(params, t)).toFixed(1)},${ballScreenY(t).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [params]);

  // 공 현재 위치
  let bx = ballScreenX(params.position);
  let by = 372;
  if (phase === 'rolling' && lastResult) {
    const t = Math.min(1, rollT);
    bx = ballScreenX(ballXAtDepth(params, t));
    by = ballScreenY(t);
  }

  const showAim = phase === 'position' || phase === 'angle' || phase === 'spin' || phase === 'power';

  return (
    <svg viewBox="0 0 400 420" className="lane-svg" role="img" aria-label="볼링 레인 장면">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wood-1)" />
          <stop offset="0.5" stopColor="var(--wood-2)" />
          <stop offset="1" stopColor="var(--wood-3)" />
        </linearGradient>
        <linearGradient id="gutter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#161d28" />
          <stop offset="1" stopColor="#252f40" />
        </linearGradient>
      </defs>

      {/* 뒤 벽 */}
      <rect x="120" y="20" width="160" height="46" rx="6" fill="var(--surface-2)" stroke="var(--border-2)" />

      {/* 거터 */}
      <polygon points="150,40 250,40 372,388 28,388" fill="url(#gutter)" />
      {/* 레인 우드 */}
      <polygon points="158,44 242,44 350,384 50,384" fill="url(#wood)" stroke="var(--wood-hi)" strokeOpacity="0.4" />
      {/* 파울 라인 */}
      <line x1="50" y1="384" x2="350" y2="384" stroke="var(--wood-hi)" strokeWidth="2" strokeOpacity="0.6" />

      {/* 예상 궤적 */}
      {showAim && (
        <polyline
          points={aimPts}
          fill="none"
          stroke="var(--accent-teal)"
          strokeWidth="2.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* 핀 */}
      {PIN_LAYOUT.map((p, i) => {
        const cx = pinX(p.x, p.y);
        const cy = pinY(p.y);
        const r = 6.5 - p.y * 1.4;
        return (
          <g key={i} opacity={standing[i] ? 1 : 0.16}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={r}
              ry={r * 1.4}
              fill={standing[i] ? 'var(--text-hi)' : 'var(--text-low)'}
              stroke="var(--danger)"
              strokeWidth={standing[i] ? 1 : 0}
            />
            <text x={cx} y={cy + 2} fontSize="5" textAnchor="middle" fill="var(--bg-0)">
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
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}

      {/* 볼링공 — 플레이어가 고른 색(자산 팩의 공 색상과 동일한 팔레트) */}
      <circle cx={bx} cy={by} r="9" fill={ballColorId ? BALL_FILL[ballColorId] : 'var(--accent-blue)'} stroke="var(--text-hi)" strokeWidth="1.5" />
      <circle cx={bx - 2.5} cy={by - 2.5} r="1.5" fill="var(--bg-0)" />
    </svg>
  );
}
