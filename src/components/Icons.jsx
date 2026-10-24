// Icon sprite rendered once in <App/>; use <Icon id="i-home"/> anywhere.
export function Icon({ id, className, style }) {
  return (
    <svg className={className} style={style} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

export function Logo({ className = 'mark' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <use href="#logo" />
    </svg>
  );
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="logo" viewBox="0 0 48 48">
          <path d="M17 9l3 4 4-6 4 6 3-4 1 7H16z" fill="#c8a565" />
          <path d="M24 17L11 43h6l2.6-6h8.8l2.6 6h6L24 17zm-2.6 15L24 25l2.6 7h-5.2z" fill="#c8a565" />
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24" {...S}><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></symbol>
        <symbol id="i-list" viewBox="0 0 24 24" {...S}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24" {...S} strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-building" viewBox="0 0 24 24" {...S}><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M3 21h18M10 7h4M10 11h4M10 15h4" /></symbol>
        <symbol id="i-chart" viewBox="0 0 24 24" {...S}><path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6" /></symbol>
        <symbol id="i-logout" viewBox="0 0 24 24" {...S}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" /></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24" {...S} strokeWidth="1.6"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></symbol>
        <symbol id="i-search" viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></symbol>
        <symbol id="i-download" viewBox="0 0 24 24" {...S}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></symbol>
        <symbol id="i-inbox" viewBox="0 0 24 24" {...S}><path d="M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5" /></symbol>
        <symbol id="i-users" viewBox="0 0 24 24" {...S}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></symbol>
        <symbol id="i-settings" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24" {...S}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24" {...S} strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></symbol>
        <symbol id="i-chev" viewBox="0 0 24 24" {...S} strokeWidth="2"><path d="M9 6l6 6-6 6" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24" {...S} strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></symbol>
      </defs>
    </svg>
  );
}
