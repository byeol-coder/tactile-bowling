// ARIA 라이브 영역 안내 컨트롤러. 같은 문장 중복 재생 방지 + 요약/상세 분리.
// 음성이 꺼져 있어도 스크린리더는 이 라이브 영역을 읽는다(텍스트 채널 보장).

let politeEl: HTMLElement | null = null;
let assertiveEl: HTMLElement | null = null;
let lastPolite = '';
let lastAssertive = '';

export function initLiveRegions(): void {
  if (politeEl && assertiveEl) return;
  politeEl = makeRegion('polite');
  assertiveEl = makeRegion('assertive');
}

function makeRegion(kind: 'polite' | 'assertive'): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-live', kind);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', kind === 'assertive' ? 'alert' : 'status');
  el.className = 'sr-only';
  el.id = `live-${kind}`;
  document.body.appendChild(el);
  return el;
}

/** 일반 상태 안내(위치/각도/파워 등). 직전과 동일하면 무시. */
export function announce(text: string): void {
  initLiveRegions();
  if (!politeEl || text === lastPolite) return;
  lastPolite = text;
  // 동일 텍스트 재알림을 위해 잠깐 비운 뒤 설정
  politeEl.textContent = '';
  window.requestAnimationFrame(() => {
    if (politeEl) politeEl.textContent = text;
  });
}

/** 중요 이벤트(스트라이크/거터/턴 전환). assertive. */
export function announceNow(text: string): void {
  initLiveRegions();
  if (!assertiveEl || text === lastAssertive) return;
  lastAssertive = text;
  assertiveEl.textContent = '';
  window.requestAnimationFrame(() => {
    if (assertiveEl) assertiveEl.textContent = text;
  });
}

export function resetAnnounceDedupe(): void {
  lastPolite = '';
  lastAssertive = '';
}
