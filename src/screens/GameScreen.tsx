import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createGame, reduce, type GameState } from '@/game/state/gameMachine';
import { computeScore } from '@/game/scoring/scoring';
import type { Player, ThrowParams } from '@/game/types';
import { Hud } from '@/components/hud/Hud';
import { Lane } from '@/components/game/Lane';
import { ThrowControls } from '@/components/game/ThrowControls';
import { Scoreboard } from '@/components/scoreboard/Scoreboard';
import { TactilePreview } from '@/components/tactile/TactilePreview';
import { simulator, broadcastTactile } from '@/tactile/adapters';
import { renderAim, renderResult, renderPinFocus } from '@/tactile/TactileRenderer';
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
  onNewGame: () => void;
}

const fmtParam = {
  position: (v: number) => (v === 0 ? '중앙' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v * 100))} 퍼센트`),
  angle: (v: number) => (v === 0 ? '정면' : `${v < 0 ? '왼쪽' : '오른쪽'} ${Math.abs(Math.round(v))}도`),
  spin: (v: number) => (v === 0 ? '회전 없음' : `${v < 0 ? '좌' : '우'}회전 ${Math.abs(Math.round(v * 100))} 퍼센트`),
  power: (v: number) => `파워 ${Math.round(v * 100)} 퍼센트`,
};

export function GameScreen({ players, prefs, onComplete, onToggleSound, onToggleSpeech, onHelp, onNewGame }: Props) {
  const [state, dispatch] = useReducer(reduce, players, createGame);
  const [rollT, setRollT] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const prevPhase = useRef<string>('');

  const standingCount = state.standing.filter(Boolean).length;

  // 게임 영역에 명시적으로 진입(포커스)한 뒤에만 방향키를 가로챈다.
  useEffect(() => {
    stageRef.current?.focus();
  }, []);

  // 촉각 프레임 + 단계 안내 갱신
  useEffect(() => {
    const p = state.phase;
    if (p === 'rolling' && state.lastResult) {
      broadcastTactile(renderResult(state.lastResult.path, state.lastResult.standing));
    } else if (p === 'result' && state.lastResult) {
      broadcastTactile(renderResult(state.lastResult.path, state.standing));
    } else {
      broadcastTactile(renderAim(state.params, state.standing));
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
      // 공 위치 팬 사운드
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

    // 점수 안내 + 호스트 통지
    const card = state.players[state.current].rolls;
    const total = computeScore(card).total;
    window.setTimeout(() => announce(`현재 점수 ${total}점.`), 700);
    notifyScore(state.players[state.current].player.name, state.frame, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.lastOutcome]);

  // 게임 종료
  useEffect(() => {
    if (state.finished) {
      audio.gameEnd();
      speak('경기 종료.', true);
      const t = window.setTimeout(() => onComplete(state), 1400);
      return () => window.clearTimeout(t);
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

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const id = matchShortcut(e.key);
    if (!id) return;
    audio.ensure();
    const fine = e.shiftKey;
    const p = state.phase;

    const gameKeys = ['moveLeft', 'moveRight', 'angleUp', 'angleDown', 'spinLeft', 'spinRight', 'power', 'confirm', 'back', 'restart', 'readState', 'readScore', 'readBoard'];
    if (gameKeys.includes(id)) e.preventDefault();

    switch (id) {
      case 'moveLeft': if (p === 'position') adjust('position', fine ? -0.03 : -0.1); break;
      case 'moveRight': if (p === 'position') adjust('position', fine ? 0.03 : 0.1); break;
      case 'angleUp': if (p === 'angle') adjust('angle', fine ? 0.5 : 2); else if (p === 'power') adjust('power', fine ? 0.02 : 0.05); break;
      case 'angleDown': if (p === 'angle') adjust('angle', fine ? -0.5 : -2); else if (p === 'power') adjust('power', fine ? -0.02 : -0.05); break;
      case 'spinLeft': if (p === 'spin') adjust('spin', fine ? -0.03 : -0.1); break;
      case 'spinRight': if (p === 'spin') adjust('spin', fine ? 0.03 : 0.1); break;
      case 'confirm':
        if (p === 'result') dispatch({ type: 'confirmTurn' });
        else if (p === 'power') doThrow();
        else if (p === 'announce' || p === 'position' || p === 'angle' || p === 'spin') doNext();
        break;
      case 'power':
        if (p === 'power') doThrow();
        else if (p === 'result') dispatch({ type: 'confirmTurn' });
        else if (p === 'announce') doNext();
        break;
      case 'back': dispatch({ type: 'prevPhase' }); break;
      case 'restart': doRestart(); break;
      case 'toggleSound': onToggleSound(); break;
      case 'toggleSpeech': onToggleSpeech(); break;
      case 'repeatTactile': {
        const f = simulator.getFrame();
        if (f) announce(`촉각 화면 다시 표시. 활성 점 ${f.dots.filter(Boolean).length}개.`);
        break;
      }
      case 'readState': {
        const pl = state.players[state.current].player.name;
        speak(`${pl}, ${state.frame + 1}프레임 ${state.frameRolls.length + 1}투구. 남은 핀 ${standingCount}개. ${fmtParam.position(state.params.position)}, ${fmtParam.angle(state.params.angle)}, ${fmtParam.power(state.params.power)}.`, true);
        break;
      }
      case 'readScore': {
        const total = computeScore(state.players[state.current].rolls).total;
        speak(`${state.players[state.current].player.name} 현재 점수 ${total}점.`, true);
        break;
      }
      case 'readBoard': {
        const nums = state.standing.map((up, i) => (up ? i + 1 : 0)).filter(Boolean);
        broadcastTactile(renderPinFocus(state.standing, -1));
        speak(nums.length ? `남은 핀 ${nums.length}개: ${nums.join(', ')}번.` : '남은 핀 없음.', true);
        break;
      }
      case 'newGame': e.preventDefault(); onNewGame(); break;
      case 'help': e.preventDefault(); onHelp(); break;
    }
  }, [state.phase, state.players, state.current, state.frame, state.frameRolls.length, state.params, state.standing, standingCount, adjust, doNext, doThrow, doRestart, onToggleSound, onToggleSpeech, onHelp, onNewGame]);

  const tactileLabel =
    state.phase === 'result' || state.phase === 'rolling' ? '투구 결과' :
    state.phase === 'announce' ? '현재 핀 배치' : '예상 궤적';

  return (
    <div className="app-shell">
      <a href="#throw-controls" className="skip-link">조작 영역으로 건너뛰기</a>
      <div className="game-layout">
        <Hud players={state.players} current={state.current} frame={state.frame} frameRollCount={state.frameRolls.length} />

        <div
          ref={stageRef}
          className="area-lane stage"
          role="application"
          aria-label="볼링 플레이 영역. 방향키·스페이스로 조작, F2 현재 상태, F3 점수, F4 남은 핀 듣기."
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <Lane
            standing={state.standing}
            params={state.params}
            phase={state.phase}
            lastResult={state.lastResult}
            rollT={rollT}
            ballColorId={state.players[state.current].player.colorId}
          />
          {state.phase === 'result' && (
            <button type="button" className="btn btn--primary stage__next" onClick={() => dispatch({ type: 'confirmTurn' })}>
              다음 →
            </button>
          )}
          {state.phase === 'announce' && (
            <button type="button" className="btn btn--primary stage__next" onClick={doNext}>
              {state.players[state.current].player.name} 차례 시작
            </button>
          )}
        </div>

        <div id="throw-controls">
          <ThrowControls phase={state.phase} params={state.params} onAdjust={adjust} onNext={doNext} onThrow={doThrow} onRestart={doRestart} />
        </div>

        <TactilePreview label={tactileLabel} />
        <Scoreboard players={state.players} currentPlayer={state.current} currentFrame={state.frame} />
      </div>
    </div>
  );
}
