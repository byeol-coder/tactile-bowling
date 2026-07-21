# 택타일 볼링 · Tactile Bowling

시각장애인과 비시각장애인이 **같은 화면·같은 규칙**으로 함께 플레이하는 포용적 10프레임 볼링 게임.
React + TypeScript + Vite. 모든 핵심 정보는 시각·음향/음성·촉각·텍스트 중 둘 이상의 채널로 동시에 전달됩니다.

🌐 [Tactile Bowling 실행하기](https://tactile-bowling.vercel.app/)

## 현재 구현 상태 (정직한 요약)

이 저장소는 사양서의 **P0(플레이 가능한 핵심)** 를 실제 동작·테스트까지 완료한 상태이며, P1/P2는 구조만 갖춘 채 남아 있습니다. 미구현 항목을 완료로 표기하지 않습니다.

### ✅ 완료 (P0)
- 정식 10프레임 볼링 점수 엔진(순수 함수) + 단위 테스트 21종 (퍼펙트 300, 스페어/스트라이크 보너스, 10프레임, 잘못된 입력 방지 포함)
- 결정론적 투구 물리(위치/각도/회전/파워 → 재현 가능한 핀 해석) + 궤적 생성
- 상태 머신(단계별 투구 흐름, 싱글 **및 로컬 2~4인** 턴 순환) + 테스트
- 키보드만으로 전체 경기 완료 가능(단계별 조작, 미세 조절, 다시 투구, 도움말)
- 플레이 화면: SVG 원근 레인·핀·볼링공·예상/실제 궤적 (외부 이미지 없음, CSS·SVG)
- HUD, 실제 `<table>` 점수표(스크린리더 대응), 결과 화면(순위·스트라이크/스페어·개인 최고 기록)
- 촉각 시뮬레이터(60×40) — DotPad 없이도 핀/궤적/결과를 점으로 표시, 어댑터 인터페이스로 분리
- Web Audio 합성 오디오(방향성 스테레오 패닝, 채널별 볼륨) + 음성 안내(TW_TTS → Web Speech → 라이브 영역 폴백)
- 진동 패턴(navigator.vibrate), ARIA 라이브 안내(요약/상세, 중복 방지)
- 설정/접근성: 고대비·큰 글자·모션 끄기·진동·음성·볼륨, `localStorage` 저장, `prefers-reduced-motion`
- 디자인 토큰(색·간격·타이포·모션·z-index), 반응형 그리드, `?embed=1` 임베드 모드
- Tactile Worlds 호스트 postMessage 브리지(ready/resize/game-start/game-complete/score-update/request-close)
- Vercel SPA rewrite 설정, production build 성공

### 🚧 남은 작업 (P1/P2) — 미구현
- **DotPad 실물 어댑터**: `DotPadAdapter` 는 인터페이스 스텁. 실제 SDK 3.0.0(`displayGraphicData`) 연동 필요.
- **게임패드/터치 입력 구현체**: 장치 선택 UI·구조는 있으나 gamepad/touch 조작 핸들러는 미구현.
- **연습 모드, 튜토리얼/캘리브레이션 화면**: 미구현.
- **진행 중 경기 자동 저장·복구(이어하기)**: 미구현.
- **Playwright 브라우저 플레이스루 15종, axe-core 자동 검사**: 미실행(도구 미설치). 현재 검증은 Vitest(jsdom) 단위/통합 + production build.
- 파워 게이지는 접근성을 위해 "값 조절 + Space 투구" 방식으로 구현(홀드-차지 애니메이션 아님).

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run test       # 단위/통합 테스트 (Vitest)
npm run typecheck  # 타입 검사
npm run lint       # ESLint
npm run build      # production build
npm run preview    # 빌드 결과 미리보기
```

## 조작 (키보드)

게임 영역을 선택(포커스)한 뒤:

| 동작 | 키 |
| --- | --- |
| 시작 위치 | `←` `→` |
| 각도 / 파워 | `↑` `↓` |
| 회전 | `Z` `X` |
| 미세 조절 | `Shift` + 방향 |
| 확정 / 다음 | `Enter` |
| 투구 | `Space` |
| 이전 단계 | `Esc` |
| 다시 투구 | `R` |
| 음향·음성 토글 | `M` `V` |
| 촉각 다시 | `T` |
| 도움말 | `F1` |

## Vercel 배포
`vercel.json` 에 SPA rewrite 가 설정되어 있어 새로고침/직접 접근 시 404 없이 동작합니다. 환경변수 없이 로컬 모드로 실행됩니다.

## 구조
`src/game`(규칙·물리·상태·점수, UI와 분리) · `src/screens` · `src/components` · `src/audio` · `src/tactile` · `src/accessibility` · `src/host` · `src/styles`.
