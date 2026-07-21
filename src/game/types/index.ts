// 게임 전역에서 공유하는 도메인 타입.
// UI/렌더/입력/음향/촉각이 모두 이 타입을 참조해 상태를 해석한다.

/** 한 프레임에서 쓰러뜨린 핀 수(투구 순서대로). 0~10. */
export type Roll = number;

/** 볼링 한 프레임. rolls 는 이 프레임에서 실제로 굴린 투구들. */
export interface Frame {
  rolls: Roll[];
  /** 이 프레임까지의 누적 점수. 보너스가 아직 확정되지 않았으면 null. */
  cumulative: number | null;
  kind: FrameKind;
}

export type FrameKind = 'open' | 'spare' | 'strike' | 'incomplete' | 'empty';

/** 점수 엔진의 전체 결과. */
export interface ScoreCard {
  frames: Frame[];
  total: number;
  /** 게임이 완전히 종료(10프레임 + 보너스 처리 완료)됐는지. */
  complete: boolean;
}

/** 플레이어 식별. 색상만으로 구분하지 않기 위해 icon/number/toneId 를 함께 둔다. */
export interface Player {
  id: string;
  name: string;
  colorId: PlayerColorId;
  iconId: PlayerIconId;
  /** 음향 테마 식별자 — 플레이어별로 다른 신호음. */
  toneId: number;
  device: InputDevice;
  best: number | null;
}

export type PlayerColorId = 'teal' | 'blue' | 'amber' | 'rose';
export type PlayerIconId = 'circle' | 'square' | 'triangle' | 'diamond';
export type InputDevice = 'keyboard' | 'gamepad' | 'touch' | 'dotpad';

/** 투구 매개변수 — 플레이어의 선택이 결과에 반영되는 결정론적 입력. */
export interface ThrowParams {
  /** 레인 가로 시작 위치. -1(맨 왼쪽) ~ +1(맨 오른쪽). */
  position: number;
  /** 조준 각도(도). 음수 = 왼쪽, 양수 = 오른쪽. */
  angle: number;
  /** 파워 0~1. */
  power: number;
  /** 회전(훅). -1(좌회전) ~ +1(우회전). */
  spin: number;
}

/** 투구 단계 상태 머신. 화면을 보지 않아도 현재 단계를 이해할 수 있어야 한다. */
export type ThrowPhase =
  | 'announce'   // 현재 플레이어/프레임 안내
  | 'position'   // 시작 위치 선택
  | 'angle'      // 방향 선택
  | 'spin'       // 회전 선택
  | 'power'      // 파워 조절
  | 'rolling'    // 공 이동 애니메이션
  | 'result';    // 결과 안내

/** 10개 핀의 쓰러짐 상태. index 0 = 1번 핀. true = 서 있음. */
export type PinState = boolean[];

export interface Vec2 {
  x: number;
  y: number;
}
