// DotPad SDK 3.0.0 의 최소 타입 선언.
// 실제 벤더 파일(DotPadSDK-3.0.0.js, ES 모듈 → window 전역)은 저장소에 포함되지 않으며,
// public/dotpad-sdk/ 에 배치하고 로드해야 합니다. (독점 SDK, 재배포 불가)

export interface DotDevice {
  numberBrailleCellColumns?: number;
  numberCellColumns?: number; // 30
  numberCellRows?: number; // 10
  // 일부 SDK 빌드는 device 에 출력 메서드를 노출
  displayGraphicData?(hex: string): void | Promise<void>;
  displayAllDown?(): void;
}

export interface DotPadSDKInstance {
  startBleScan?(): Promise<unknown>;
  connectBleDevice(ble?: unknown): Promise<DotDevice | null>;
  connectUsbDevice?(): Promise<DotDevice | null>;
  getConnectedDevices?(): DotDevice[];
  disconnect(): void;
  // 일부 SDK 빌드는 sdk 인스턴스에 출력 메서드를 노출
  displayGraphicData?(hex: string): void | Promise<void>;
  displayTextData?(text: string): void | Promise<void>;
  displayAllDown?(): void;
  setCallBack?(message: (...a: unknown[]) => void, key: (...a: unknown[]) => void): void;
}

export interface DotPadSDKConstructor {
  new (): DotPadSDKInstance;
}

declare global {
  interface Window {
    DotPadSDK?: DotPadSDKConstructor;
  }
}
