// 음성 안내. Tactile Worlds 환경에서는 TW_TTS 우선, 없으면 Web Speech API,
// 그것도 없으면 ARIA 라이브 영역(텍스트 채널)으로 폴백.

import { announce, announceNow } from '@/accessibility/announcements';

interface TwTts {
  speak: (text: string, opts?: { interrupt?: boolean }) => void;
  cancel?: () => void;
}

function twTts(): TwTts | null {
  const w = window as unknown as { TW_TTS?: TwTts };
  return w.TW_TTS ?? null;
}

let enabled = true;
let volume = 1;

export function setSpeechEnabled(v: boolean): void {
  enabled = v;
  if (!v) cancelSpeech();
}
export function setSpeechVolume(v: number): void {
  volume = v;
}

export function cancelSpeech(): void {
  twTts()?.cancel?.();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * 말하기. urgent=true 면 진행 중 안내를 끊고 즉시 안내(스트라이크/거터 등).
 * 음성이 꺼져 있어도 라이브 영역에는 항상 텍스트를 반영한다.
 */
export function speak(text: string, urgent = false): void {
  // 텍스트 채널은 항상 유지(스크린리더 사용자 보장)
  if (urgent) announceNow(text);
  else announce(text);

  if (!enabled) return;

  const tw = twTts();
  if (tw) {
    tw.speak(text, { interrupt: urgent });
    return;
  }

  if ('speechSynthesis' in window) {
    if (urgent) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.volume = volume;
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }
}
