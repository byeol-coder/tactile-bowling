import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconHelp,
  IconMessageCircle,
  IconMessageCircleOff,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { createGame, reduce, type GameState } from '@/game/state/gameMachine';
import type { Player, ThrowParams } from '@/game/types';
import { Hud } from '@/components/hud/Hud';
import { Lane } from '@/components/game/Lane';
import { ThrowControls } from '@/components/game/ThrowControls';
import { Scoreboard } from '@/components/scoreboard/Scoreboard';
import { TactilePreview } from '@/components/tactile/TactilePreview';
import { simulator } from '@/tactile/adapters';
import { renderAim, renderResult } from '@/tactile/TactileRenderer';
import { audio } from '@/audio/AudioEngine';
import { speak } from '@/audio/speech';
import { announce } from '@/accessibility/announcements';
import { haptic, powerHaptic } from '@/accessibility/haptics';
import { matchShortcut } from '@/accessibility/shortcuts';
import type { Preferences } from '@/accessibility/preferences';
import { notifyScore } from '@/host/bridge';

interface Props {
  players: Player[];
  prefs: Preferences;
  onComplete: (state: GameState) => void;
  onToggleSound: () => void;
  onToggleSpeech: () => void;
  onHelp: () => void;
}

const fmtParam = {
  position: (v: number) => (v === 0 ? '중앙' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v * 100))} 퍼센트`),
  angle: (v: number) => (v === 0 ? '정면' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v))}도`),
  spin: (v: number) => (v === 0 ? '회전 없음' : `${v < 0 ? '좌' : '우'}회전 ${Math.abs(Math.round(v * 100))} 퍼센트`),
  power: (v: number) => `파워 ${Math.round(v * 100)} 퍼센트`,
};

const PHASE_COPY: Record<string, { kicker: string; title: string; hint: string }> = {
  announce: { kicker: 'READY', title: '차례를 시작하세요', hint: '레인의 핀 배치를 확인한 뒤 시작합니다.' },
  position: { kicker: 'STEP 1', title: '공을 놓을 위치를 정하세요', hint: '좌우 방향키로 시작 위치를 움직입니다.' },
  angle: { kicker: 'STEP 2', title: '핀을 향할 방향을 정하세요', hint: '위아래 방향키로 투구 각도를 조절합니다.' },
  spin: { kicker: 'STEP 3', title: '공의 회전을 선택하세요', hint: 'Z와 X 키로 훅 방향을 조절합니다.' },
  power: { kicker: 'FINAL STEP', title: '힘을 정하고 공을 던지세요', hint: 'Space 키 또는 공 던지기 버튼으로 투구합니다.' },
  rolling: { kicker: 'ROLLING', title: '공이 레인을 달리고 있어요', hint: '소리와 촉각으로 이동 방향을 함께 확인하세요.' },
  result: { kicker: 'RESULT', title: '투구 결과를 확인하세요', hint: '남은 핀과 점수를 확인한 뒤 다음으로 이동합니다.' },
  complete: { kicker: 'SCORE', title: '점수를 계산하고 있어요', hint: '다음 프레임을 준비합니다.' },
};

const OUTCOME_COPY: Record<string, string> = {
  strike: 'STRIKE!',
  spare: 'SPARE!',
  gutter: 'GUTTER',
  open: 'NICE ROLL',
};

export function GameScreen({ players, prefs, onComplete, onToggleSound, onToggleSpeech, onHelp }: Props) {
  const [state, dispatch] = useReducer(reduce, players, createGame);
  const [rollT, setRollT] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const prevPhase = useRef<string>('');

  const standingCount = state.standing.filter(Boolean).length;
  const soundOn = prefs.volEffects > 0 || prefs.volMusic > 0;
  const phaseCopy = PHASE_COPY[state.phase] ?? PHASE_COPY.announce;

  // 게임 영역에 명시적으로 진입(포커스)한 뒤에만 방향키를 가로챈다.
  useEffect(() => {
    stageRef.current?.focus();
  }, []);

  // 촉각 프레임 + 단계 안내 갱신
  useEffect(() => {
    const p = state.phase;
    if (p === 'rolling' && state.lastResult) {
      void simulator.renderFrame(renderResult(state.lastResult.path, state.lastResult.standing));
    } else if (p === 'result' && state.lastResult) {
      void simulator.renderFrame(renderResult(state.lastResult.path, state.standing));
    } else {
      void simulator.renderFrame(renderAim(state.params, state.standing));
    }

    if (p !== prevPhase.current) {
      prevPhase.current = p;
      if (p === 'announce') {
        speak(`${state.players[state.current].player.name} 차례. ${state.frame + 1}프레임 ${state.frameRolls.length + 1}투구. 남은 핀 ${standingCount}개. 확인하려면 엔터.`, true);
      } else if (p === 'position') {
        speak(`시작 위치 선택. ${fmtParam.position(state.params.position)}`);
      } else if (p === 'angle') {
        speak(`방향 선택. ${fmtParam.angle(state.params.angle)}`);
      } else if (p === 'spin') {
        speak(`회전 선택. ${fmtParam.spin(state.params.spin)}`);
      } else if (p === 'power') {
        speak(`파워 조절. ${fmtParam.power(state.params.power)}. 스페이스로 투구.`);
      }
    }
  }, [state, standingCount]);

  // 공 이동 애니메이션 → settle
  useEffect(() => {
    if (state.phase !== 'rolling' || !state.lastResult) return;
    const reduced = prefs.motion === 'off';
    const dur = reduced ? 240 : 1300;
    const start = performance.now();
    let raf = 0;
    audio.roll(state.params.position);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setRollT(t);
      if (t < 1 && Math.random() < 0.1) audio.roll(state.params.position + state.params.spin * 0.4 * t * t);
      if (t < 1) raf = requestAnimationFrame(step);
      else dispatch({ type: 'settle' });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // 결과 피드백(음향/음성/진동)
  useEffect(() => {
    if (state.phase !== 'result' || !state.lastOutcome || !state.lastResult) return;
    const o = state.lastOutcome;
    const down = state.lastResult.pinsDown;
    if (o === 'strike') { audio.strike(); haptic('strike'); speak('스트라이크! 10핀 모두 쓰러졌습니다.', true); }
    else if (o === 'spare') { audio.spare(); haptic('spare'); speak('스페어! 남은 핀을 모두 쓰러뜨렸습니다.', true); }
    else if (o === 'gutter') { audio.gutter(); haptic('gutter'); speak('거터. 0핀.', true); }
    else { audio.open(); haptic('open'); audio.pinHit(state.params.position); speak(`${down}핀 쓰러짐.`, true); }

    const card = state.players[state.current].rolls;
    import('@/game/scoring/scoring').then(({ computeScore }) => {
      const total = computeScore(card).total;
      window.setTimeout(() => announce(`현재 점수 ${total}점.`), 700);
      notifyScore(state.players[state.current].player.name, state.frame, total);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.lastOutcome]);

  // 게임 종료
  useEffect(() => {
    if (state.finished) {
      audio.gameEnd();
      speak('경기 종료.', true);
      const timer = window.setTimeout(() => onComplete(state), 1400);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.finished]);

  const adjust = useCallback((key: keyof ThrowParams, delta: number) => {
    audio.ensure();
    dispatch({ type: 'adjust', key, delta });
  }, []);

  const doNext = useCallback(() => { audio.ensure(); dispatch({ type: 'nextPhase' }); }, []);
  const doThrow = useCallback(() => { audio.ensure(); audio.release(state.params.position); haptic('release'); dispatch({ type: 'throw' }); }, [state.params.position]);
  const doRestart = useCallback(() => { audio.ensure(); dispatch({ type: 'restartThrow' }); }, []);

  // 조작 후 상태 안내(폴리트)
  useEffect(() => {
    const p = state.phase;
    if (p === 'position') { announce(fmtParam.position(state.params.position)); audio.move(state.params.position); haptic('move'); }
    else if (p === 'angle') { announce(fmtParam.angle(state.params.angle)); audio.fine(0); }
    else if (p === 'spin') { announce(fmtParam.spin(state.params.spin)); audio.fine(state.params.spin); }
    else if (p === 'power') { announce(fmtParam.power(state.params.power)); audio.powerTick(state.params.power); powerHaptic(state.params.power); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.params]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const id = matchShortcut(event.key);
    if (!id) return;
    audio.ensure();
    const fine = event.shiftKey;
    const phase = state.phase;

    const gameKeys = ['moveLeft', 'moveRight', 'angleUp', 'angleDown', 'spinLeft', 'spinRight', 'power', 'confirm', 'back', 'restart'];
    if (gameKeys.includes(id)) event.preventDefault();

    switch (id) {
      case 'moveLeft': if (phase === 'position') adjust('position', fine ? -0.03 : -0.1); break;
      case 'moveRight': if (phase === 'position') adjust('position', fine ? 0.03 : 0.1); break;
      case 'angleUp': if (phase === 'angle') adjust('angle', fine ? 0.5 : 2); else if (phase === 'power') adjust('power', fine ? 0.02 : 0.05); break;
      case 'angleDown': if (phase === 'angle') adjust('angle', fine ? -0.5 : -2); else if (phase === 'power') adjust('power', fine ? -0.02 : -0.05); break;
      case 'spinLeft': if (phase === 'spin') adjust('spin', fine ? -0.03 : -0.1); break;
      case 'spinRight': if (phase === 'spin') adjust('spin', fine ? 0.03 : 0.1); break;
      case 'confirm':
        if (phase === 'result') dispatch({ type: 'confirmTurn' });
        else if (phase === 'power') doThrow();
        else if (phase === 'announce' || phase === 'position' || phase === 'angle' || phase === 'spin') doNext();
        break;
      case 'power':
        if (phase === 'power') doThrow();
        else if (phase === 'result') dispatch({ type: 'confirmTurn' });
        else if (phase === 'announce') doNext();
        break;
      case 'back': dispatch({ type: 'prevPhase' }); break;
      case 'restart': doRestart(); break;
      case 'toggleSound': onToggleSound(); break;
      case 'toggleSpeech': onToggleSpeech(); break;
      case 'repeatTactile': {
        const frame = simulator.getFrame();
        if (frame) announce(`촉각 화면 다시 표시. 활성 점 ${frame.dots.filter(Boolean).length}개.`);
        break;
      }
      case 'help': event.preventDefault(); onHelp(); break;
    }
  }, [state.phase, adjust, doNext, doThrow, doRestart, onToggleSound, onToggleSpeech, onHelp]);

  const tactileLabel =
    state.phase === 'result' || state.phase === 'rolling' ? '투구 결과' :
    state.phase === 'announce' ? '현재 핀 배치' : '예상 궤적';

  return (
    <div className="app-shell game-shell">
      <a href="#throw-controls" className="skip-link">조작 영역으로 건너뛰기</a>
      <div className="game-layout">
        <Hud players={state.players} current={state.current} frame={state.frame} frameRollCount={state.frameRolls.length} />

        <div
          ref={stageRef}
          className={`area-lane stage stage--${state.phase}`}
          role="application"
          aria-label="볼링 플레이 영역. 방향키와 스페이스로 조작합니다."
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <div className="stage__chrome">
            <div className="stage__status" aria-hidden="true">
              <span>{phaseCopy.kicker}</span>
              <strong>{phaseCopy.title}</strong>
              <small>{phaseCopy.hint}</small>
            </div>
            <div className="stage__tools" aria-label="게임 보조 기능">
              <button
                type="button"
                className="btn btn--ghost btn--icon stage__tool"
                onClick={onToggleSound}
                aria-label={soundOn ? '게임 음향 끄기' : '게임 음향 켜기'}
                aria-pressed={soundOn}
                title={soundOn ? '음향 켜짐' : '음향 꺼짐'}
              >
                {soundOn ? <IconVolume size={20} aria-hidden="true" /> : <IconVolumeOff size={20} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--icon stage__tool"
                onClick={onToggleSpeech}
                aria-label={prefs.speech ? '음성 안내 끄기' : '음성 안내 켜기'}
                aria-pressed={prefs.speech}
                title={prefs.speech ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
              >
                {prefs.speech ? <IconMessageCircle size={20} aria-hidden="true" /> : <IconMessageCircleOff size={20} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--icon stage__tool"
                onClick={onHelp}
                aria-label="게임 도움말 열기"
                title="도움말"
              >
                <IconHelp size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          <Lane standing={state.standing} params={state.params} phase={state.phase} lastResult={state.lastResult} rollT={rollT} />

          <div className="stage__pin-count" aria-label={`남은 핀 ${standingCount}개`}>
            <span>남은 핀</span>
            <strong>{standingCount}</strong>
          </div>

          {state.phase === 'result' && state.lastOutcome && (
            <div className={`stage__outcome stage__outcome--${state.lastOutcome}`} aria-hidden="true">
              {OUTCOME_COPY[state.lastOutcome] ?? OUTCOME_COPY.open}
            </div>
          )}

          {state.phase === 'result' && (
            <button type="button" className="btn btn--primary stage__next" onClick={() => dispatch({ type: 'confirmTurn' })}>
              다음 투구 <IconArrowRight size={20} aria-hidden="true" />
            </button>
          )}
          {state.phase === 'announce' && (
            <button type="button" className="btn btn--primary stage__next" onClick={doNext}>
              <IconPlayerPlay size={20} aria-hidden="true" /> {state.players[state.current].player.name} 차례 시작
            </button>
          )}
        </div>

        <div id="throw-controls" className="area-controls-wrap">
          <ThrowControls phase={state.phase} params={state.params} onAdjust={adjust} onNext={doNext} onThrow={doThrow} onRestart={doRestart} />
        </div>

        <TactilePreview label={tactileLabel} />
        <Scoreboard players={state.players} currentPlayer={state.current} currentFrame={state.frame} />
      </div>
    </div>
  );
}