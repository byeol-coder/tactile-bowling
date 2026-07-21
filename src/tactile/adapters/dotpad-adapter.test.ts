import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DotPadAdapter } from './index';
import { renderLane } from '@/tactile/TactileRenderer';
import { ALL_UP } from '@/game/physics/resolve';

function installFakeSdk(opts: { on: 'device' | 'sdk' } = { on: 'sdk' }) {
  const sent: string[] = [];
  const disconnect = vi.fn();
  const startBleScan = vi.fn(async () => {});
  const display = vi.fn((hex: string) => { sent.push(hex); });

  class FakeSDK {
    startBleScan = startBleScan;
    disconnect = disconnect;
    displayGraphicData = opts.on === 'sdk' ? display : undefined;
    async connectBleDevice() {
      return opts.on === 'device'
        ? { numberCellColumns: 30, numberCellRows: 10, displayGraphicData: display }
        : { numberCellColumns: 30, numberCellRows: 10 };
    }
  }
  (window as unknown as { DotPadSDK: unknown }).DotPadSDK = FakeSDK;
  (navigator as unknown as { bluetooth: unknown }).bluetooth = {};
  return { sent, disconnect, startBleScan };
}

describe('DotPadAdapter — 연결/출력 동작', () => {
  beforeEach(() => {
    delete (window as unknown as { DotPadSDK?: unknown }).DotPadSDK;
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
  });

  it('SDK 미로드 시 연결은 명확히 실패', async () => {
    const a = new DotPadAdapter();
    await expect(a.connect()).rejects.toThrow(/SDK/);
    expect(a.isConnected()).toBe(false);
  });

  it('연결 흐름: startBleScan → connectBleDevice, 연결 후 clear 전송', async () => {
    const { sent, startBleScan } = installFakeSdk({ on: 'sdk' });
    const a = new DotPadAdapter();
    await a.connect();
    expect(startBleScan).toHaveBeenCalled();
    expect(a.isConnected()).toBe(true);
    expect(sent[0]).toBe('0'.repeat(600)); // clear
  });

  it('프레임을 600 hex 로 전송하고 동일 프레임은 재전송하지 않음', async () => {
    const { sent } = installFakeSdk({ on: 'sdk' });
    const a = new DotPadAdapter();
    await a.connect();
    const before = sent.length;
    const f = renderLane(ALL_UP);
    await a.renderFrame(f);
    await a.renderFrame(f); // 동일 → 무시
    expect(sent.length).toBe(before + 1);
    expect(sent[before]).toHaveLength(600);
  });

  it('출력 메서드가 device 에 있을 때도 동작', async () => {
    const { sent } = installFakeSdk({ on: 'device' });
    const a = new DotPadAdapter();
    await a.connect();
    await a.renderFrame(renderLane(ALL_UP));
    expect(sent.some((h) => h.length === 600 && /[1-9a-f]/.test(h))).toBe(true);
  });

  it('미연결 상태에서는 renderFrame 이 아무것도 보내지 않음', async () => {
    installFakeSdk();
    const a = new DotPadAdapter();
    await a.renderFrame(renderLane(ALL_UP)); // connect 안 함
    expect(a.isConnected()).toBe(false);
  });

  it('disconnect 후 연결 해제 상태', async () => {
    const { disconnect } = installFakeSdk();
    const a = new DotPadAdapter();
    await a.connect();
    await a.disconnect();
    expect(disconnect).toHaveBeenCalled();
    expect(a.isConnected()).toBe(false);
  });
});
