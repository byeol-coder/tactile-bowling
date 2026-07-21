// 단축키 맵 — 설정 화면에서 확인/변경 가능하도록 데이터로 관리.

export interface Shortcut {
  id: string;
  label: string;
  keys: string[]; // KeyboardEvent.key 또는 .code 후보
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'moveLeft', label: '시작 위치 왼쪽', keys: ['ArrowLeft'] },
  { id: 'moveRight', label: '시작 위치 오른쪽', keys: ['ArrowRight'] },
  { id: 'angleUp', label: '각도 위로', keys: ['ArrowUp'] },
  { id: 'angleDown', label: '각도 아래로', keys: ['ArrowDown'] },
  { id: 'spinLeft', label: '좌회전', keys: ['z', 'Z'] },
  { id: 'spinRight', label: '우회전', keys: ['x', 'X'] },
  { id: 'power', label: '파워 충전 / 투구', keys: [' ', 'Spacebar'] },
  { id: 'confirm', label: '선택 확정', keys: ['Enter'] },
  { id: 'back', label: '이전 단계 / 일시정지', keys: ['Escape'] },
  { id: 'restart', label: '이 투구 다시', keys: ['r', 'R'] },
  { id: 'help', label: '도움말 (F1)', keys: ['F1'] },
  { id: 'readState', label: '현재 상태 듣기 (F2)', keys: ['F2'] },
  { id: 'readScore', label: '점수 듣기 (F3)', keys: ['F3'] },
  { id: 'readBoard', label: '전체 핀 배치 다시 (F4)', keys: ['F4'] },
  { id: 'newGame', label: '새 게임', keys: ['n', 'N'] },
  { id: 'toggleSound', label: '음향 켜기/끄기', keys: ['m', 'M'] },
  { id: 'toggleSpeech', label: '음성 안내 켜기/끄기', keys: ['v', 'V'] },
  { id: 'repeatTactile', label: '촉각 안내 다시', keys: ['t', 'T'] },
];

/** 눌린 키가 어떤 액션인지 조회. */
export function matchShortcut(key: string, shortcuts: Shortcut[] = DEFAULT_SHORTCUTS): string | null {
  for (const s of shortcuts) if (s.keys.includes(key)) return s.id;
  return null;
}
