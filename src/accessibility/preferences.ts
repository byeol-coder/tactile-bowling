// 접근성/설정 옵션 — localStorage 에 저장하고 문서 루트 data-attr 로 동기화.

export interface Preferences {
  contrast: 'normal' | 'high';
  textSize: 'normal' | 'large';
  motion: 'on' | 'off';
  vibration: boolean;
  speech: boolean;
  speechDetail: 'summary' | 'detailed';
  volMusic: number; // 0~1
  volEffects: number;
  volSpeech: number;
}

export const DEFAULT_PREFS: Preferences = {
  contrast: 'normal',
  textSize: 'normal',
  motion: 'on',
  vibration: true,
  speech: true,
  speechDetail: 'summary',
  volMusic: 0.4,
  volEffects: 0.8,
  volSpeech: 1,
};

const KEY = 'tactile-bowling:prefs';

export function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Preferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* 저장 불가 환경(프라이빗 모드 등)에서도 게임 진행에 영향 없음 */
  }
}

/** 문서 루트에 data-attr 반영 → tokens.css 의 모드별 오버라이드 활성화. */
export function applyPrefsToDom(prefs: Preferences): void {
  const el = document.documentElement;
  el.dataset.contrast = prefs.contrast === 'high' ? 'high' : '';
  el.dataset.textsize = prefs.textSize === 'large' ? 'large' : '';
  el.dataset.motion = prefs.motion === 'off' ? 'off' : '';
}

/** URL 에서 임베드 모드 감지(?embed=1). */
export function detectEmbed(): boolean {
  try {
    const embed = new URLSearchParams(location.search).get('embed') === '1';
    if (embed) document.documentElement.dataset.embed = '1';
    return embed;
  } catch {
    return false;
  }
}
