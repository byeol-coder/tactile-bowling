import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefsToDom } from './preferences';

describe('preferences — 저장·복원', () => {
  beforeEach(() => localStorage.clear());

  it('저장한 설정을 복원한다', () => {
    savePrefs({ ...DEFAULT_PREFS, contrast: 'high', textSize: 'large', volMusic: 0.1 });
    const p = loadPrefs();
    expect(p.contrast).toBe('high');
    expect(p.textSize).toBe('large');
    expect(p.volMusic).toBe(0.1);
  });

  it('저장값이 없으면 기본값', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('applyPrefsToDom 이 data-attr 를 반영', () => {
    applyPrefsToDom({ ...DEFAULT_PREFS, contrast: 'high', textSize: 'large', motion: 'off' });
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(document.documentElement.dataset.textsize).toBe('large');
    expect(document.documentElement.dataset.motion).toBe('off');
  });
});
