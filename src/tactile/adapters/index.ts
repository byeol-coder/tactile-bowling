// 촉각 하드웨어 로직을 UI 와 분리하는 어댑터 계층.
// 실제 DotPad 가 없을 때도 동일한 데이터로 화면 시뮬레이터가 작동한다.

import type { TactileFrame } from '@/tactile/patterns';

export type TactilePattern = number[]; // 진동 ms 패턴

export interface TactileDeviceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  renderFrame(frame: TactileFrame): Promise<void>;
  clear(): Promise<void>;
  vibrate?(pattern: TactilePattern): Promise<void>;
}

/** 화면 시뮬레이터 어댑터 — 프레임을 구독자(React 컴포넌트)에게 전달. */
export class SimulatorAdapter implements TactileDeviceAdapter {
  private connected = false;
  private current: TactileFrame | null = null;
  private listeners = new Set<(f: TactileFrame | null) => void>();

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  isConnected(): boolean { return this.connected; }

  async renderFrame(frame: TactileFrame): Promise<void> {
    this.current = frame;
    this.listeners.forEach((l) => l(frame));
  }
  async clear(): Promise<void> {
    this.current = null;
    this.listeners.forEach((l) => l(null));
  }
  async vibrate(pattern: TactilePattern): Promise<void> {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }

  getFrame(): TactileFrame | null { return this.current; }
  subscribe(fn: (f: TactileFrame | null) => void): () => void {
    this.listeners.add(fn);
    fn(this.current);
    return () => this.listeners.delete(fn);
  }
}

/**
 * DotPad 어댑터 스텁. 실제 연동은 DotPad SDK 3.0.0(displayGraphicData, 60×40)로
 * 확장 예정(P1). 현재는 인터페이스만 만족하며 하드웨어 미연결을 명확히 알린다.
 */
export class DotPadAdapter implements TactileDeviceAdapter {
  private connected = false;
  async connect(): Promise<void> {
    throw new Error('DotPad SDK 연동은 아직 구현되지 않았습니다(P1). 시뮬레이터를 사용하세요.');
  }
  async disconnect(): Promise<void> { this.connected = false; }
  isConnected(): boolean { return this.connected; }
  async renderFrame(_frame: TactileFrame): Promise<void> { void _frame; }
  async clear(): Promise<void> {}
}

export const simulator = new SimulatorAdapter();
