import { useState } from 'react';
import type { InputDevice, Player, PlayerColorId, PlayerIconId } from '@/game/types';

interface Props {
  minPlayers: number;
  maxPlayers: number;
  onStart: (players: Player[]) => void;
  onBack: () => void;
}

const COLORS: PlayerColorId[] = ['teal', 'blue', 'amber', 'rose'];
const ICONS: PlayerIconId[] = ['circle', 'square', 'triangle', 'diamond'];
const ICON_LABEL: Record<PlayerIconId, string> = { circle: '원', square: '사각', triangle: '삼각', diamond: '마름모' };
const DEVICES: { id: InputDevice; label: string }[] = [
  { id: 'keyboard', label: '키보드' },
  { id: 'touch', label: '터치' },
  { id: 'gamepad', label: '게임패드' },
  { id: 'dotpad', label: 'DotPad' },
];

interface Draft { name: string; device: InputDevice; }

export function PlayerSetupScreen({ minPlayers, maxPlayers, onStart, onBack }: Props) {
  const [count, setCount] = useState(Math.max(minPlayers, 1));
  const [drafts, setDrafts] = useState<Draft[]>(
    Array.from({ length: maxPlayers }, (_, i) => ({ name: `플레이어 ${i + 1}`, device: 'keyboard' as InputDevice })),
  );

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const start = () => {
    const players: Player[] = drafts.slice(0, count).map((d, i) => ({
      id: `p${i}`,
      name: d.name.trim() || `플레이어 ${i + 1}`,
      colorId: COLORS[i % COLORS.length],
      iconId: ICONS[i % ICONS.length],
      toneId: i,
      device: d.device,
      best: null,
    }));
    onStart(players);
  };

  return (
    <main className="form">
      <h1>플레이어 설정</h1>

      {maxPlayers > 1 && (
        <div className="field">
          <span id="count-label">플레이어 수</span>
          <div className="seg" role="group" aria-labelledby="count-label">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}>{n}명</button>
            ))}
          </div>
        </div>
      )}

      {drafts.slice(0, count).map((d, i) => (
        <div key={i} className="player-card">
          <p className="player-card__head">
            <img
              className="player-ball"
              src={`/assets/balls/ball-${COLORS[i % COLORS.length]}-512.png`}
              alt=""
              aria-hidden="true"
            />
            P{i + 1} · 아이콘 {ICON_LABEL[ICONS[i % ICONS.length]]}
          </p>
          <div className="player-card__grid">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`name-${i}`}>이름</label>
              <input id={`name-${i}`} type="text" value={d.name} maxLength={16} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`dev-${i}`}>입력 장치</label>
              <select id={`dev-${i}`} value={d.device} onChange={(e) => update(i, { device: e.target.value as InputDevice })}>
                {DEVICES.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onBack}>뒤로</button>
        <button type="button" className="btn btn--primary btn--lg" onClick={start}>경기 시작</button>
      </div>
    </main>
  );
}
