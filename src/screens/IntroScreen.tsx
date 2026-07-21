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
        {/* 히어로 사진(장식) — 텍스트는 항상 DOM에 별도로 존재하므로 배경엔 접근성 이름이 필요 없음 */}
        <div className="intro__decor" aria-hidden="true" />

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
