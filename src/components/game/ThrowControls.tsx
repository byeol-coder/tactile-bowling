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

const STEPS: { id: ThrowPhase; label: string; short: string }[] = [
  { id: 'position', label: '시작 위치', short: '위치' },
  { id: 'angle', label: '투구 방향', short: '방향' },
  { id: 'spin', label: '공의 회전', short: '회전' },
  { id: 'power', label: '투구 파워', short: '파워' },
];

const fmt = {
  position: (v: number) => (v === 0 ? '중앙' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v * 100))}%`),
  angle: (v: number) => (v === 0 ? '정면' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v))}°`),
  spin: (v: number) => (v === 0 ? '회전 없음' : `${v < 0 ? '좌' : '우'}회전 ${Math.abs(Math.round(v * 100))}%`),
  power: (v: number) => `${Math.round(v * 100)}%`,
};

const STEP_META: Record<'position' | 'angle' | 'spin' | 'power', { delta: number; min: number; max: number; hint: string }> = {
  position: { delta: 0.1, min: -1, max: 1, hint: '← → 방향키로 공의 시작 위치를 정하세요.' },
  angle: { delta: 2, min: -20, max: 20, hint: '↑ ↓ 방향키로 핀을 향할 각도를 정하세요.' },
  spin: { delta: 0.1, min: -1, max: 1, hint: 'Z / X 키로 훅의 방향과 세기를 정하세요.' },
  power: { delta: 0.05, min: 0, max: 1, hint: '↑ ↓로 힘을 조절하고 Space 키로 투구하세요.' },
};

const IDLE_COPY: Partial<Record<ThrowPhase, { title: string; hint: string }>> = {
  announce: { title: '레인 준비 완료', hint: '현재 플레이어의 차례를 시작하면 위치 조절로 이동합니다.' },
  rolling: { title: '투구 중', hint: '공의 이동과 핀 충돌을 소리·화면·촉각으로 확인하세요.' },
  result: { title: '투구 결과', hint: '쓰러진 핀을 확인하고 다음 투구로 이동하세요.' },
  complete: { title: '프레임 완료', hint: '점수를 계산하고 있습니다.' },
};

function Meter({ value, min, max, strong }: { value: number; min: number; max: number; strong: boolean }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`meter ${strong ? 'meter--power' : ''}`} aria-hidden="true">
      <div className="meter__fill" style={{ width: `${pct}%` }} />
      {min < 0 && <div className="meter__zero" />}
    </div>
  );
}

export function ThrowControls({ phase, params, onAdjust, onNext, onThrow, onRestart }: Props) {
  const activeStep = STEPS.find((step) => step.id === phase);
  const isControllable = Boolean(activeStep);

  if (!isControllable || !activeStep) {
    const copy = IDLE_COPY[phase] ?? { title: '게임 진행 중', hint: '음성 안내와 화면 지시에 따라 플레이하세요.' };
    return (
      <section className={`controls controls--status controls--${phase} area-controls`} aria-label="투구 상태">
        <ol className="controls__steps" aria-label="투구 단계">
          {STEPS.map((step) => <li key={step.id} className="controls__step">{step.short}</li>)}
        </ol>
        <div className="controls__status" role="status">
          <span className="controls__status-mark" aria-hidden="true" />
          <span>
            <strong>{copy.title}</strong>
            <small>{copy.hint}</small>
          </span>
        </div>
        {phase === 'result' && (
          <button type="button" className="btn btn--ghost controls__restart" onClick={onRestart}>
            <IconRefresh size={20} aria-hidden="true" /> 같은 조건으로 다시 조준
          </button>
        )}
      </section>
    );
  }

  const activeKey = activeStep.id as keyof typeof STEP_META;
  const meta = STEP_META[activeKey];
  const isPower = phase === 'power';

  return (
    <section className={`controls controls--${phase} area-controls`} aria-label="투구 조작">
      <ol className="controls__steps" aria-label="투구 단계">
        {STEPS.map((step, index) => {
          const activeIndex = STEPS.findIndex((item) => item.id === phase);
          const state = index < activeIndex ? 'is-done' : index === activeIndex ? 'is-active' : '';
          return (
            <li key={step.id} className={`controls__step ${state}`} aria-current={phase === step.id ? 'step' : undefined}>
              <span className="controls__step-num" aria-hidden="true">{index + 1}</span>
              <span>{step.short}</span>
            </li>
          );
        })}
      </ol>

      <div className="controls__panel">
        <div className="controls__row">
          <span>
            <span className="controls__label">{activeStep.label}</span>
            <span className="controls__hint">{meta.hint}</span>
          </span>
          <output className="controls__value" aria-live="off">
            {fmt[activeKey](params[activeKey])}
          </output>
        </div>

        <div className="controls__adjuster">
          <button
            type="button"
            className="btn btn--ghost btn--icon controls__adj"
            onClick={() => onAdjust(activeKey, -meta.delta)}
            aria-label={`${activeStep.label} 감소`}
          >
            <IconChevronLeft size={24} aria-hidden="true" />
          </button>
          <Meter value={params[activeKey]} min={meta.min} max={meta.max} strong={isPower} />
          <button
            type="button"
            className="btn btn--ghost btn--icon controls__adj"
            onClick={() => onAdjust(activeKey, meta.delta)}
            aria-label={`${activeStep.label} 증가`}
          >
            <IconChevronRight size={24} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="controls__actions">
        <button type="button" className="btn btn--ghost" onClick={onRestart} aria-label="이 투구 다시 시작">
          <IconRefresh size={20} aria-hidden="true" /> 다시
        </button>
        {isPower ? (
          <button type="button" className="btn btn--primary btn--lg controls__primary" onClick={onThrow}>
            <IconTargetArrow size={23} aria-hidden="true" /> 공 던지기
          </button>
        ) : (
          <button type="button" className="btn btn--primary controls__primary" onClick={onNext}>
            다음 단계
          </button>
        )}
      </div>
    </section>
  );
}