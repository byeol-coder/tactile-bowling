import { useEffect, useState } from 'react';
import { IconBluetooth, IconBluetoothConnected, IconBluetoothOff } from '@tabler/icons-react';
import { simulator, dotpad } from '@/tactile/adapters';
import { TW, TH, type TactileFrame } from '@/tactile/patterns';
import { announce } from '@/accessibility/announcements';
import './tactilePreview.css';

interface Props {
  label: string;
}

/** DotPad 실물이 없어도 동일 데이터를 화면에 촉각점으로 표시하는 시뮬레이터. */
export function TactilePreview({ label }: Props) {
  const [frame, setFrame] = useState<TactileFrame | null>(simulator.getFrame());
  const [connected, setConnected] = useState(dotpad.isConnected());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => simulator.subscribe(setFrame), []);

  const supported = dotpad.isSupported();

  const toggle = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (connected) {
        await dotpad.disconnect();
        setConnected(false);
        announce('DotPad 연결을 해제했습니다.');
      } else {
        await dotpad.connect();
        setConnected(true);
        if (frame) void dotpad.renderFrame(frame);
        announce('DotPad 가 연결되었습니다. 촉각 화면이 실물에 함께 출력됩니다.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'DotPad 연결 오류';
      setErr(msg);
      announce(msg);
    } finally {
      setBusy(false);
    }
  };

  const gap = 3.2;
  const dotR = 1.4;
  const dots: { x: number; y: number }[] = [];
  if (frame) {
    for (let y = 0; y < TH; y++) {
      for (let x = 0; x < TW; x++) {
        if (frame.dots[y * TW + x]) dots.push({ x, y });
      }
    }
  }

  return (
    <section className="tactile panel area-tactile" aria-label="촉각 미리보기">
      <div className="tactile__head">
        <span className="eyebrow">촉각 미리보기 60×40</span>
        <span className="tactile__mode">{label}</span>
      </div>
      <svg
        viewBox={`0 0 ${TW * gap} ${TH * gap}`}
        className="tactile__svg"
        role="img"
        aria-label={`촉각 화면: ${label}. 활성 점 ${dots.length}개.`}
      >
        <rect x="0" y="0" width={TW * gap} height={TH * gap} rx="6" fill="var(--bg-0)" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x * gap + gap / 2} cy={d.y * gap + gap / 2} r={dotR} fill="var(--accent-amber)" />
        ))}
      </svg>

      <div className="tactile__foot">
        <button
          type="button"
          className={`btn ${connected ? 'btn--primary' : 'btn--ghost'} tactile__connect`}
          onClick={toggle}
          disabled={busy || !supported}
          aria-pressed={connected}
        >
          {connected ? <IconBluetoothConnected size={18} /> : supported ? <IconBluetooth size={18} /> : <IconBluetoothOff size={18} />}
          {connected ? 'DotPad 연결됨' : busy ? '연결 중…' : 'DotPad 연결'}
        </button>
        {!supported && <span className="tactile__note">Web Bluetooth 미지원 또는 SDK 미로드</span>}
        {err && <span className="tactile__note tactile__note--err" role="alert">{err}</span>}
      </div>
    </section>
  );
}
