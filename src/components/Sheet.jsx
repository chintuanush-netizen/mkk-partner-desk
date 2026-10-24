import { useEffect, useRef } from 'react';
import { Icon } from './Icons.jsx';

/** Bottom sheet on phones, centred dialog on wider screens. */
export function Sheet({ open, onClose, children, className = 'sheet', inner = 'sh' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try { d.showModal(); } catch { d.setAttribute('open', ''); }
      d.scrollTop = 0;
    } else if (!open && d.open) {
      try { d.close(); } catch { d.removeAttribute('open'); }
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={className}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && <div className={inner}>{children}</div>}
    </dialog>
  );
}

export function CloseButton({ onClick, className = 'iconbtn' }) {
  return (
    <button className={className} type="button" onClick={onClick} aria-label="Close">
      <Icon id="i-x" />
    </button>
  );
}
