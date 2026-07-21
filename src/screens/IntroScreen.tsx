import { IconAccessible, IconHelp, IconPlayerPlay, IconSettings, IconUsers } from '@tabler/icons-react';

interface Props {
  onStartSingle: () => void;
  onStartMulti: () => void;
  onSettings: () => void;
  onHelp: () => void;
}

export function IntroScreen({ onStartSingle, onStartMulti, onSettings, onHelp }: Props) {
  return (
    <main className="intro">
      <div className="intro__hero">
        {/* 시그니처: 소실점 레인 (CSS/SVG, 외부 이미지 없음) */}
        <svg className="intro__decor" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="hero-wood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--wood-1)" stopOpacity="0.15" />
              <stop offset="1" stopColor="var(--wood-3)" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <polygon points="360,120 440,120 620,600 180,600" fill="url(#hero-wood)" />
          <line x1="400" y1="120" x2="400" y2="600" stroke="var(--accent-teal)" strokeWidth="1.5" strokeDasharray="6 12" opacity="0.4" />
          {[
            [400, 150], [384, 172], [416, 172], [368, 196], [400, 196], [432, 196],
            [352, 224], [384, 224], [416, 224], [448, 224],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="5" ry="8" fill="var(--text-hi)" opacity="0.5" />
          ))}
        </svg>

        <div className="intro__content anim-rise">
          <p className="eyebrow">Tactile Worlds · 함께 플레이</p>
          <h1 className="intro__title">택타일 <em>볼링</em></h1>
          <p className="intro__tag">보이든 보이지 않든, 같은 레인 위에서 같은 규칙으로. 소리·촉각·화면으로 함께 즐기는 10프레임 볼링.</p>

          <nav className="intro__menu" aria-label="메인 메뉴">
            <button type="button" className="btn btn--primary btn--lg btn--wide" onClick={onStartSingle}>
              <IconPlayerPlay size={22} /> 게임 시작 (싱글)
            </button>
            <button type="button" className="btn" onClick={onStartMulti}>
              <IconUsers size={20} /> 로컬 멀티플레이
            </button>
            <button type="button" className="btn" onClick={onSettings}>
              <IconSettings size={20} /> 설정
            </button>
            <button type="button" className="btn" onClick={onSettings}>
              <IconAccessible size={20} /> 접근성 설정
            </button>
            <button type="button" className="btn" onClick={onHelp}>
              <IconHelp size={20} /> 도움말
            </button>
          </nav>
        </div>
      </div>
    </main>
  );
}
