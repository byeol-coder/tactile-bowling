// 촉각 하드웨어 로직을 UI 와 분리하는 어댑터 계층.
// 실제 DotPad 가 없을 때도 동일한 데이터로 화면 시뮬레이터가 작동한다.

import type { TactileFrame } from '@/tactile/patterns';
import { frameToDotPadHex, BLANK_HEX } from './encode';
import type { DotDevice, DotPadSDKInstance } from './dotpad-sdk.d';

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
 * DotPad SDK 3.0.0 어댑터 (Web Bluetooth).
 *
 * 연결 흐름: `new DotPadSDK()` → `startBleScan()`(있으면) → `connectBleDevice()` → DotDevice.
 * 출력: 60×40 프레임을 600 hex 로 인코딩 후 `displayGraphicData(hex)`.
 * SDK 빌드에 따라 출력 메서드가 sdk 인스턴스 또는 device 에 있어, 존재하는 쪽을 사용한다.
 *
 * 주의: 벤더 SDK(DotPadSDK-3.0.0.js)는 저장소에 포함되지 않으며 window.DotPadSDK 전역으로
 * 로드되어야 한다. 미로드 시 명확한 오류를 던진다. 임베드 시 iframe 에 allow="bluetooth" 필요.
 */
export class DotPadAdapter implements TactileDeviceAdapter {
  private sdk: DotPadSDKInstance | null = null;
  private device: DotDevice | null = null;
  private connected = false;
  private lastHex = '';

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.DotPadSDK === 'function' && 'bluetooth' in navigator;
  }

  async connect(): Promise<void> {
    if (typeof window === 'undefined' || typeof window.DotPadSDK !== 'function') {
      throw new Error('DotPad SDK 를 찾을 수 없습니다. public/dotpad-sdk/DotPadSDK-3.0.0.js 를 로드하세요.');
    }
    if (!('bluetooth' in navigator)) {
      throw new Error('이 브라우저는 Web Bluetooth 를 지원하지 않습니다. (Chrome/Edge 권장)');
    }
    const sdk = new window.DotPadSDK();
    if (typeof sdk.startBleScan === 'function') {
      await sdk.startBleScan(); // 기기 선택 창(사용자 제스처 필요)
    }
    const device = await sdk.connectBleDevice();
    if (!device) throw new Error('DotPad 연결에 실패했습니다.');
    this.sdk = sdk;
    this.device = device;
    this.connected = true;
    await this.clear();
  }

  async disconnect(): Promise<void> {
    try { this.sdk?.disconnect(); } catch { /* noop */ }
    this.sdk = null;
    this.device = null;
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  private send(hex: string): void {
    if (this.device && typeof this.device.displayGraphicData === 'function') {
      void this.device.displayGraphicData(hex);
    } else if (this.sdk && typeof this.sdk.displayGraphicData === 'function') {
      void this.sdk.displayGraphicData(hex);
    } else {
      throw new Error('SDK 에 displayGraphicData 가 없습니다.');
    }
  }

  async renderFrame(frame: TactileFrame): Promise<void> {
    if (!this.connected) return;
    const hex = frameToDotPadHex(frame);
    if (hex === this.lastHex) return; // 동일 프레임 재전송 방지
    this.lastHex = hex;
    this.send(hex);
  }

  async clear(): Promise<void> {
    if (!this.connected) return;
    this.lastHex = BLANK_HEX;
    this.send(BLANK_HEX);
  }
}

export const simulator = new SimulatorAdapter();
export const dotpad = new DotPadAdapter();

/** 한 프레임을 시뮬레이터와(연결됐다면) DotPad 실물에 동시에 표시. */
export function broadcastTactile(frame: TactileFrame): void {
  void simulator.renderFrame(frame);
  if (dotpad.isConnected()) void dotpad.renderFrame(frame);
}

export { frameToDotPadHex } from './encode';
