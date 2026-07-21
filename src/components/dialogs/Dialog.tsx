import { useEffect, useRef, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 포커스 트랩 + 닫은 후 포커스 복귀를 갖춘 모달. */
export function Dialog({ title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement;
    const node = ref.current;
    const focusables = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled')) : [];
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="btn btn--ghost dialog__close" onClick={onClose} aria-label="닫기">
          <IconX size={20} />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
