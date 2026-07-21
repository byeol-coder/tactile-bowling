import { describe, it, expect, beforeEach } from 'vitest';
import { announce, initLiveRegions, resetAnnounceDedupe } from './announcements';

describe('announcements — 중복 방지', () => {
  beforeEach(() => { resetAnnounceDedupe(); });

  it('라이브 영역을 생성한다', () => {
    initLiveRegions();
    expect(document.getElementById('live-polite')).not.toBeNull();
    expect(document.getElementById('live-assertive')).not.toBeNull();
  });

  it('동일 문장 연속 호출은 한 번만 갱신 준비', async () => {
    initLiveRegions();
    const el = document.getElementById('live-polite')!;
    announce('위치 중앙');
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(el.textContent).toBe('위치 중앙');
    // 같은 문장 재호출 → 내용 유지(중복 재생 방지)
    announce('위치 중앙');
    expect(el.textContent).toBe('위치 중앙');
  });
});
