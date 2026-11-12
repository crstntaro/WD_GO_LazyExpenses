export function AppHeader({ questionKey = 0, onHome, onAccount }: { questionKey?: number; onHome?: () => void; onAccount?: () => void }) {
  return (
    <header className="masthead">
      <a className="logo" href="#top" aria-label="Where'd It Go? home" onClick={(event) => { if (onHome) { event.preventDefault(); onHome(); } }}>
        <span className="logo-copy">
          <span className="logo-wordmark">where&apos;d it go<span key={questionKey} className={`question${questionKey ? " is-curious" : ""}`}>?</span></span>
          <span className="logo-tag">THE LOST &amp; FOUND MONEY CLUB</span>
        </span>
      </a>
      <button type="button" className="account-avatar" aria-label="Your account" aria-haspopup="dialog" onClick={(event)=>{event.currentTarget.focus({preventScroll:true});onAccount?.();}}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg></button>
    </header>
  );
}
