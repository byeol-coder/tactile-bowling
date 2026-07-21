import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/app/App';

describe('App — 화면 라우팅(스모크)', () => {
  it('인트로가 렌더되고 타이틀이 보인다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /택타일/ })).toBeInTheDocument();
  });

  it('싱글 시작 → 플레이 영역으로 이동', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /게임 시작/ }));
    expect(screen.getByRole('application', { name: /볼링 플레이 영역/ })).toBeInTheDocument();
    // 점수표(표 구조) 존재
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('로컬 멀티 → 플레이어 설정 화면', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /로컬 멀티플레이/ }));
    expect(screen.getByRole('heading', { name: /플레이어 설정/ })).toBeInTheDocument();
  });
});
