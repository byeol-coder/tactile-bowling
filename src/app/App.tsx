import { useCallback, useEffect, useState } from 'react';
import { IntroScreen } from '@/screens/IntroScreen';
import { PlayerSetupScreen } from '@/screens/PlayerSetupScreen';
import { GameScreen } from '@/screens/GameScreen';
import { ResultScreen } from '@/screens/ResultScreen';
import { HelpDialog, SettingsDialog } from '@/components/dialogs/HelpSettings';
import type { Player } from '@/game/types';
import type { GameState } from '@/game/state/gameMachine';
import {
  DEFAULT_PREFS,
  applyPrefsToDom,
  detectEmbed,
  loadPrefs,
  savePrefs,
  type Preferences,
} from '@/accessibility/preferences';
import { audio } from '@/audio/AudioEngine';
import { setSpeechEnabled, setSpeechVolume, ensureTwTts } from '@/audio/speech';
import { setHapticsEnabled } from '@/accessibility/haptics';
import { initLiveRegions } from '@/accessibility/announcements';
import { computeScore } from '@/game/scoring/scoring';
import { notifyGameStart, notifyReady } from '@/host/bridge';

type Screen = 'intro' | 'setup' | 'game' | 'result';

const BESTS_KEY = 'tactile-bowling:bests';
function loadBests(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(BESTS_KEY) || '{}'); } catch { return {}; }
}

const soloPlayer = (): Player[] => [
  { id: 'p0', name: '플레이어 1', colorId: 'teal', iconId: 'circle', toneId: 0, device: 'keyboard', best: null },
];

export function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [players, setPlayers] = useState<Player[]>(soloPlayer());
  const [finalState, setFinalState] = useState<GameState | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [dialog, setDialog] = useState<'help' | 'settings' | null>(null);
  const [bests, setBests] = useState<Record<string, number>>({});
  const [resultBests, setResultBests] = useState<Record<string, number>>({});
  const [gameKey, setGameKey] = useState(0);
  void bests;

  // 초기화: 설정 로드, 임베드 감지, 라이브 영역, 호스트 ready
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    setBests(loadBests());
    detectEmbed();
    ensureTwTts();
    initLiveRegions();
    notifyReady();
  }, []);

  // prefs → DOM/오디오/음성/햅틱 동기화 + 저장
  useEffect(() => {
    applyPrefsToDom(prefs);
    savePrefs(prefs);
    audio.setVolume('music', prefs.volMusic);
    audio.setVolume('effects', prefs.volEffects);
    setSpeechEnabled(prefs.speech);
    setSpeechVolume(prefs.volSpeech);
    setHapticsEnabled(prefs.vibration);
  }, [prefs]);

  const patchPrefs = useCallback((patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const startSingle = () => { setPlayers(soloPlayer()); setGameKey((k) => k + 1); setScreen('game'); notifyGameStart(1); };
  const startMulti = () => setScreen('setup');
  const beginWith = (ps: Player[]) => { setPlayers(ps); setGameKey((k) => k + 1); setScreen('game'); notifyGameStart(ps.length); };

  const handleComplete = useCallback((state: GameState) => {
    setBests((prev) => {
      setResultBests({ ...prev }); // 이번 경기 반영 전 기록(신기록 판정용)
      const next = { ...prev };
      state.players.forEach((pr) => {
        const total = computeScore(pr.rolls).total;
        if (total > (next[pr.player.name] ?? 0)) next[pr.player.name] = total;
      });
      try { localStorage.setItem(BESTS_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
    setFinalState(state);
    setScreen('result');
  }, []);

  const rematch = () => { setGameKey((k) => k + 1); setScreen('game'); };

  return (
    <>
      {screen === 'intro' && (
        <IntroScreen
          onStartSingle={startSingle}
          onStartMulti={startMulti}
          onSettings={() => setDialog('settings')}
          onHelp={() => setDialog('help')}
        />
      )}

      {screen === 'setup' && (
        <PlayerSetupScreen minPlayers={2} maxPlayers={4} onStart={beginWith} onBack={() => setScreen('intro')} />
      )}

      {screen === 'game' && (
        <GameScreen
          key={gameKey}
          players={players}
          prefs={prefs}
          onComplete={handleComplete}
          onToggleSound={() => patchPrefs({ volEffects: prefs.volEffects > 0 ? 0 : 0.8, volMusic: prefs.volMusic > 0 ? 0 : 0.4 })}
          onToggleSpeech={() => patchPrefs({ speech: !prefs.speech })}
          onHelp={() => setDialog('help')}
          onNewGame={rematch}
        />
      )}

      {screen === 'result' && finalState && (
        <ResultScreen
          state={finalState}
          bests={resultBests}
          onRematch={rematch}
          onSamePlayers={rematch}
          onMenu={() => setScreen('intro')}
        />
      )}

      {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog === 'settings' && <SettingsDialog prefs={prefs} onChange={patchPrefs} onClose={() => setDialog(null)} />}
    </>
  );
}
