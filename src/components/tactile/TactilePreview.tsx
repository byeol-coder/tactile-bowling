import { useEffect, useState } from 'react';
import { simulator } from '@/tactile/adapters';
import { TW, TH, type TactileFrame } from '@/tactile/patterns';
import './tactilePreview.css';

interface Props {
  label: string;
}

/** DotPad 실물이 없어도 동일 데이터를 화면에 촉각점으로 표시하는 시뮬레이터. */
export function TactilePreview({ label }: Props) {
  const [frame, setFrame] = useState<TactileFrame | null>(simulator.getFrame());
  useEffect(() => simulator.subscribe(setFrame), []);

  const dotR = 1.4;
  const gap = 3.2;
  const dots: { x: number; y: number }[] = [];
  if (frame) {
    for (let y = 0; y < TH; y++) {
      for (let x = 0; x < TW; x++) {
        if (frame.dots[y * TW + x]) dots.push({ x, y });
      }
    }
  }

  return (
    <section className="tactile area-tactile" aria-label="촉각 미리보기">
      <div className="tactile__head">
        <span>
          <strong>촉각 보조 화면</strong>
          <small>DotPad 60×40</small>
        </span>
        <span className="tactile__mode">{label}</span>
      </div>
      <div className="tactile__canvas">
        <svg
          viewBox={`0 0 ${TW * gap} ${TH * gap}`}
          className="tactile__svg"
          role="img"
          aria-label={`촉각 화면: ${label}. 활성 점 ${dots.length}개.`}
        >
          <rect x="0" y="0" width={TW * gap} height={TH * gap} rx="6" fill="var(--bg-0)" />
          {dots.map((dot, index) => (
            <circle key={index} cx={dot.x * gap + gap / 2} cy={dot.y * gap + gap / 2} r={dotR} fill="var(--accent-amber)" />
          ))}
        </svg>
      </div>
      <div className="tactile__foot">
        <span className="tactile__status" aria-hidden="true" />
        <span>활성 점 {dots.length}개</span>
      </div>
    </section>
  );
}