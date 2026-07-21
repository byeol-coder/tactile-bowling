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
      <section className="intro__hero" aria-labelledby="intro-title">
        <img
          className="intro__art"
          src="/assets/intro-bowling-hero.svg"
          alt=""
          aria-hidden="true"
        />
        <div className="intro__shade" aria-hidden="true" />

        <header className="intro__topbar">
          <div className="intro__brand" aria-label="Tactile Worlds 게임">
            <span className="intro__brand-mark" aria-hidden="true">10</span>
            <span>Tactile Worlds</span>
          </div>
          <div className="intro__utility" aria-label="도움말 및 설정">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={onSettings}
              aria-label="접근성 및 게임 설정 열기"
              title="설정"
            >
              <IconSettings size={21} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={onHelp}
              aria-label="게임 도움말 열기"
              title="도움말"
            >
              <IconHelp size={21} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="intro__content anim-rise">
          <p className="eyebrow">함께 즐기는 10프레임 볼링</p>
          <h1 className="intro__title" id="intro-title">
            <span className="sr-only">택타일 볼링</span>
            <span className="intro__title-kicker">TACTILE</span>
            <strong>BOWLING</strong>
          </h1>
          <p className="intro__tag">
            보이든 보이지 않든 같은 레인, 같은 규칙으로 플레이하세요.
            소리·촉각·화면이 하나의 짜릿한 투구로 이어집니다.
          </p>

          <nav className="intro__menu" aria-label="메인 메뉴">
            <button type="button" className="btn btn--primary btn--lg" onClick={onStartSingle}>
              <IconPlayerPlay size={24} aria-hidden="true" />
              게임 시작
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onStartMulti}>
              <IconUsers size={22} aria-hidden="true" />
              로컬 멀티플레이
            </button>
          </nav>

          <div className="intro__access" aria-label="지원하는 플레이 방식">
            <IconAccessible size={21} aria-hidden="true" />
            <span>키보드 · 음성 안내 · 촉각 미리보기 지원</span>
          </div>
        </div>

        <aside className="intro__challenge" aria-label="게임 안내">
          <span className="intro__challenge-label">첫 번째 미션</span>
          <strong>한가운데를 노려 스트라이크!</strong>
          <span>방향과 힘을 조절한 뒤 스페이스 키로 투구하세요.</span>
        </aside>
      </section>
    </main>
  );
}