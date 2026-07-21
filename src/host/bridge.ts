// Tactile Worlds 호스트 연동. 호스트가 없어도 독립 실행에 영향 없음.

export type HostMessage =
  | { type: 'ready' }
  | { type: 'resize'; height: number }
  | { type: 'game-start'; players: number }
  | { type: 'game-complete'; scores: { name: string; total: number }[] }
  | { type: 'score-update'; player: string; frame: number; total: number }
  | { type: 'request-close' };

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function postToHost(msg: HostMessage): void {
  if (!inIframe()) return;
  try {
    // dotarcade 규약과 호환: source 표식 부착
    window.parent.postMessage({ source: 'dotarcade', ...msg }, '*');
  } catch {
    /* 호스트 없음 — 무시 */
  }
}

export function notifyReady(): void { postToHost({ type: 'ready' }); }
export function notifyResize(height: number): void { postToHost({ type: 'resize', height }); }
export function notifyGameStart(players: number): void { postToHost({ type: 'game-start', players }); }
export function notifyGameComplete(scores: { name: string; total: number }[]): void {
  postToHost({ type: 'game-complete', scores });
}
export function notifyScore(player: string, frame: number, total: number): void {
  postToHost({ type: 'score-update', player, frame, total });
}
export function requestClose(): void { postToHost({ type: 'request-close' }); }
