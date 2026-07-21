import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { speak, setSpeechEnabled } from './speech';
import { initLiveRegions } from '@/accessibility/announcements';

describe('speech — TW_TTS 우선 / 임베드에서 speechSynthesis 억제', () => {
  beforeEach(() => {
    initLiveRegions();
    setSpeechEnabled(true);
    delete (window as unknown as { TW_TTS?: unknown }).TW_TTS;
    document.documentElement.removeAttribute('data-embed');
  });
  afterEach(() => {
    delete (window as unknown as { TW_TTS?: unknown }).TW_TTS;
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    document.documentElement.removeAttribute('data-embed');
  });

  it('TW_TTS 가 있으면 그것을 사용한다', () => {
    const spk = vi.fn();
    (window as unknown as { TW_TTS: unknown }).TW_TTS = { speak: spk };
    speak('스트라이크');
    expect(spk).toHaveBeenCalledWith('스트라이크', { interrupt: false });
  });

  it('임베드 + TW_TTS 없음 → speechSynthesis 를 호출하지 않는다', async () => {
    document.documentElement.dataset.embed = '1';
    const synth = { cancel: vi.fn(), speak: vi.fn() };
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { text: string; constructor(t: string) { this.text = t; } };
    speak('테스트');
    expect(synth.speak).not.toHaveBeenCalled();
    // 텍스트 채널(라이브 영역)은 유지 (polite 는 rAF 로 갱신)
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.getElementById('live-polite')?.textContent).toContain('테스트');
  });

  it('독립 실행(비임베드) → speechSynthesis 폴백 사용', () => {
    const synth = { cancel: vi.fn(), speak: vi.fn() };
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { text: string; constructor(t: string) { this.text = t; } };
    speak('테스트');
    expect(synth.speak).toHaveBeenCalled();
  });
});
