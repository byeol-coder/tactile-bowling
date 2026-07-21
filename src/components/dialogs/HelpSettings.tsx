import { Dialog } from './Dialog';
import { DEFAULT_SHORTCUTS } from '@/accessibility/shortcuts';
import type { Preferences } from '@/accessibility/preferences';

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="도움말 · 조작 방법" onClose={onClose}>
      <p>모든 조작은 키보드만으로 가능합니다. 게임 영역을 선택(포커스)한 뒤 방향키와 스페이스로 플레이하세요.</p>
      <table className="scoreboard__table" style={{ marginTop: 12 }}>
        <caption className="sr-only">단축키 목록</caption>
        <thead>
          <tr><th scope="col" style={{ textAlign: 'left' }}>동작</th><th scope="col">키</th></tr>
        </thead>
        <tbody>
          {DEFAULT_SHORTCUTS.map((s) => (
            <tr key={s.id}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 400 }}>{s.label}</th>
              <td><span className="kbd">{s.keys[0] === ' ' ? 'Space' : s.keys[0]}</span></td>
            </tr>
          ))}
          <tr>
            <th scope="row" style={{ textAlign: 'left', fontWeight: 400 }}>미세 조절</th>
            <td><span className="kbd">Shift</span> + 방향</td>
          </tr>
        </tbody>
      </table>
    </Dialog>
  );
}

interface SettingsProps {
  prefs: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
  onClose: () => void;
}

function Toggle({ label, value, on, off, onToggle }: { label: string; value: boolean; on: string; off: string; onToggle: (v: boolean) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        <button type="button" aria-pressed={value} onClick={() => onToggle(true)}>{on}</button>
        <button type="button" aria-pressed={!value} onClick={() => onToggle(false)}>{off}</button>
      </div>
    </div>
  );
}

export function SettingsDialog({ prefs, onChange, onClose }: SettingsProps) {
  const Range = ({ label, value, key }: { label: string; value: number; key: keyof Preferences }) => (
    <div className="field">
      <label htmlFor={`r-${String(key)}`}>{label} · {Math.round(value * 100)}%</label>
      <div className="range-row">
        <input
          id={`r-${String(key)}`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<Preferences>)}
        />
      </div>
    </div>
  );

  return (
    <Dialog title="설정 · 접근성" onClose={onClose}>
      <Toggle label="고대비 모드" value={prefs.contrast === 'high'} on="켬" off="끔" onToggle={(v) => onChange({ contrast: v ? 'high' : 'normal' })} />
      <Toggle label="큰 글자 모드" value={prefs.textSize === 'large'} on="켬" off="끔" onToggle={(v) => onChange({ textSize: v ? 'large' : 'normal' })} />
      <Toggle label="애니메이션" value={prefs.motion === 'on'} on="켬" off="끔" onToggle={(v) => onChange({ motion: v ? 'on' : 'off' })} />
      <Toggle label="진동(햅틱)" value={prefs.vibration} on="켬" off="끔" onToggle={(v) => onChange({ vibration: v })} />
      <Toggle label="음성 안내" value={prefs.speech} on="켬" off="끔" onToggle={(v) => onChange({ speech: v })} />
      <Toggle label="음성 상세도" value={prefs.speechDetail === 'detailed'} on="상세" off="요약" onToggle={(v) => onChange({ speechDetail: v ? 'detailed' : 'summary' })} />
      <Range label="배경음 볼륨" value={prefs.volMusic} key="volMusic" />
      <Range label="효과음 볼륨" value={prefs.volEffects} key="volEffects" />
      <Range label="음성 볼륨" value={prefs.volSpeech} key="volSpeech" />
    </Dialog>
  );
}
