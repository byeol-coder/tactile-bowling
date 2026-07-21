import { IconChevronLeft, IconChevronRight, IconRefresh, IconTargetArrow } from '@tabler/icons-react';
import type { ThrowParams, ThrowPhase } from '@/game/types';
import './throwControls.css';

interface Props {
  phase: ThrowPhase;
  params: ThrowParams;
  onAdjust: (key: keyof ThrowParams, delta: number) => void;
  onNext: () => void;
  onThrow: () => void;
  onRestart: () => void;
}

const STEPS: { id: ThrowPhase; label: string }[] = [
  { id: 'position', label: '위치' },
  { id: 'angle', label: '방향' },
  { id: 'spin', label: '회전' },
  { id: 'power', label: '파워' },
];

const fmt = {
  position: (v: number) => (v === 0 ? '중앙' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v * 100))}%`),
  angle: (v: number) => (v === 0 ? '정면' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v))}도`),
  spin: (v: number) => (v === 0 ? '없음' : `${v < 0 ? '좌' : '우'}회전 ${Math.abs(Math.round(v * 100))}%`),
  power: (v: number) => `${Math.round(v * 100)}%`,
};

const STEP_META: Record<'position' | 'angle' | 'spin' | 'power', { delta: number; min: number; max: number; hint: string }> = {
  position: { delta: 0.1, min: -1, max: 1, hint: '← → 로 조절' },
  angle: { delta: 2, min: -20, max: 20, hint: '↑ ↓ 로 조절' },
  spin: { delta: 0.1, min: -1, max: 1, hint: 'Z / X 로 조절' },
  power: { delta: 0.05, min: 0, max: 1, hint: '↑ ↓ 로 조절, Space 로 투구' },
};

function Meter({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="meter" aria-hidden="true">
      <div className="meter__fill" style={{ width: `${pct}%` }} />
      {min < 0 && <div className="meter__zero" />}
    </div>
  );
}

export function ThrowControls({ phase, params, onAdjust, onNext, onThrow, onRestart }: Props) {
  const activeKey = (STEPS.find((s) => s.id === phase)?.id ?? 'position') as keyof typeof STEP_META;
  const meta = STEP_META[activeKey];
  const isPower = phase === 'power';

  return (
    <section className="controls panel panel--accent area-controls" aria-label="투구 조작">
      <ol className="controls__steps">
        {STEPS.map((s) => (
          <li key={s.id} className={`controls__step ${phase === s.id ? 'is-active' : ''}`} aria-current={phase === s.id ? 'step' : undefined}>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="controls__panel">
        <div className="controls__row">
          <span className="controls__label">{STEPS.find((s) => s.id === phase)?.label ?? '준비'}</span>
          <output
            className="controls__value"
            aria-live="off"
          >
            {fmt[activeKey](params[activeKey])}
          </output>
        </div>
        <Meter value={params[activeKey]} min={meta.min} max={meta.max} />
        <p className="controls__hint">{meta.hint}</p>

        <div className="controls__buttons">
          <button
            type="button"
            className="btn btn--ghost controls__adj"
            onClick={() => onAdjust(activeKey, -meta.delta)}
            aria-label={`${STEPS.find((s) => s.id === phase)?.label} 감소`}
          >
            <IconChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="btn btn--ghost controls__adj"
            onClick={() => onAdjust(activeKey, meta.delta)}
            aria-label={`${STEPS.find((s) => s.id === phase)?.label} 증가`}
          >
            <IconChevronRight size={22} />
          </button>
        </div>
      </div>

      <div className="controls__actions">
        <button type="button" className="btn btn--ghost" onClick={onRestart} aria-label="이 투구 다시 시작">
          <IconRefresh size={20} /> 다시
        </button>
        {isPower ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={onThrow}>
            <IconTargetArrow size={22} /> 투구
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--lg" onClick={onNext}>
            다음
          </button>
        )}
      </div>
    </section>
  );
}
