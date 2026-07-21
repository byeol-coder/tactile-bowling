// 게임 상태 → 촉각 프레임 변환. 시각/음향과 동일한 상태를 근거로 그린다.

import type { PinState, ThrowParams, Vec2 } from '@/game/types';
import { PIN_LAYOUT, ballXAtDepth } from '@/game/physics/resolve';
import {
  ball,
  blank,
  dottedLine,
  line,
  pinSelected,
  pinUp,
  TH,
  TW,
  thickDottedLine,
  type TactileFrame,
} from './patterns';

// 그리드 매핑: 핀은 상단(원거리), 볼러는 하단.
const PIN_ROW = (depth: number) => 14 - depth * 10; // 4~14
const PIN_COL = (x: number) => 30 + x * 22; // 8~52
const LANE_TOP = 3;
const LANE_BOTTOM = 38;
const laneCol = (x: number) => 30 + x * 24;
// 궤적: y 0(볼러, 하단) ~ 1(핀 데크, 상단)
const pathRow = (y: number) => LANE_BOTTOM - y * (LANE_BOTTOM - 16);

function drawLane(f: TactileFrame): void {
  line(f, laneCol(-1), LANE_TOP, laneCol(-1), LANE_BOTTOM); // 좌 경계
  line(f, laneCol(1), LANE_TOP, laneCol(1), LANE_BOTTOM); // 우 경계
  dottedLine(f, 30, 16, 30, LANE_BOTTOM, 4); // 중앙 가이드(낮은 밀도)
}

function drawPins(f: TactileFrame, standing: PinState, selected: number | null): void {
  PIN_LAYOUT.forEach((p, i) => {
    if (!standing[i]) return; // 쓰러진 핀은 그리지 않음
    const cx = PIN_COL(p.x);
    const cy = PIN_ROW(p.y);
    if (i === selected) pinSelected(f, cx, cy);
    else pinUp(f, cx, cy);
  });
}

function paramPath(params: ThrowParams): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= 12; i++) {
    const y = i / 12;
    pts.push({ x: laneCol(ballXAtDepth(params, y)), y: pathRow(y) });
  }
  return pts;
}

/** 전체 레인 + 현재 핀 배치. */
export function renderLane(standing: PinState): TactileFrame {
  const f = blank();
  drawLane(f);
  drawPins(f, standing, null);
  return f;
}

/** 투구 전 예상 궤적(점선) 포함. */
export function renderAim(params: ThrowParams, standing: PinState): TactileFrame {
  const f = blank();
  drawLane(f);
  const pts = paramPath(params);
  dottedLineFromPts(f, pts, 2);
  drawPins(f, standing, null);
  // 공 시작 위치
  ball(f, laneCol(params.position), LANE_BOTTOM - 1);
  return f;
}

/** 투구 후 실제 궤적(굵게) + 남은 핀. */
export function renderResult(path: Vec2[], standing: PinState): TactileFrame {
  const f = blank();
  drawLane(f);
  const pts = path.map((p) => ({ x: laneCol(p.x), y: pathRow(p.y) }));
  thickDottedLine(f, pts);
  drawPins(f, standing, null);
  return f;
}

/** 현재 선택 핀 강조(핀별 탐색용). */
export function renderPinFocus(standing: PinState, selected: number): TactileFrame {
  const f = blank();
  drawLane(f);
  drawPins(f, standing, selected);
  return f;
}

function dottedLineFromPts(f: TactileFrame, pts: Vec2[], gap: number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    if (i % 1 === 0) dottedLine(f, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, gap);
  }
}

export { TW, TH };
export type { TactileFrame };
