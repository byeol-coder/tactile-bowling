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

function isEmbed(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.embed === '1';
}

// 표준 TW_TTS 스크립트(호스트 제공). 임베드에서 호스트가 주입하지 않은 경우 best-effort 로드.
const TW_TTS_SRC = 'https://dot-games-host.vercel.app/tts.js';
let ttsLoadTried = false;
export function ensureTwTts(): void {
  if (ttsLoadTried || twTts() || typeof document === 'undefined') return;
  ttsLoadTried = true;
  if (!isEmbed()) return; // 독립 실행 시엔 로드하지 않음(Web Speech 폴백 사용)
  const s = document.createElement('script');
  s.src = TW_TTS_SRC;
  s.async = true;
  s.onerror = () => { /* 호스트가 이미 제공하거나 미가용 — 라이브 영역 텍스트로 폴백 */ };
  document.head.appendChild(s);
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

  // 가이드: 임베드 환경에서 브라우저 speechSynthesis 직접 호출은 불안정 → 사용하지 않음.
  // (텍스트는 위 라이브 영역으로 이미 전달됨. 호스트 TW_TTS 주입 시 그쪽을 사용.)
  if (isEmbed()) return;

  if ('speechSynthesis' in window) {
    if (urgent) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.volume = volume;
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }
}
