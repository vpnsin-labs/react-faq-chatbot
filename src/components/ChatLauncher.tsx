import { useEffect, useState } from 'react';
import type { ChatbotLabels, IconSet, NudgeConfig } from '../types';
import { getIcon } from './icons';

interface ChatLauncherProps {
  open: boolean;
  labels: ChatbotLabels;
  icons?: IconSet;
  nudge?: NudgeConfig | false;
  nudgeStorageKey: string;
  onToggle: () => void;
}

export function ChatLauncher({
  open,
  labels,
  icons,
  nudge,
  nudgeStorageKey,
  onToggle,
}: ChatLauncherProps) {
  const [showNudge, setShowNudge] = useState(false);

  // Depend on the primitive fields, not the `nudge` object identity, so passing
  // an inline `nudge={{ text }}` (a fresh object each render) doesn't keep
  // restarting the timer and prevent the bubble from ever appearing.
  const nudgeText = nudge ? nudge.text : null;
  const nudgeDelay = nudge ? (nudge.delayMs ?? 4000) : 4000;

  useEffect(() => {
    if (nudgeText == null || open) return;
    if (typeof window === 'undefined') return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(nudgeStorageKey) === '1';
    } catch {
      /* storage unavailable */
    }
    if (dismissed) return;
    const t = setTimeout(() => setShowNudge(true), nudgeDelay);
    return () => clearTimeout(t);
  }, [nudgeText, nudgeDelay, open, nudgeStorageKey]);

  const dismissNudge = () => {
    setShowNudge(false);
    try {
      window.sessionStorage.setItem(nudgeStorageKey, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {nudge && showNudge && !open && (
        <div className="rfc-nudge" role="status">
          <button
            type="button"
            className="rfc-nudge__close"
            aria-label={labels.closeAriaLabel}
            onClick={dismissNudge}
          >
            {getIcon('close', icons)}
          </button>
          <button
            type="button"
            className="rfc-nudge__body"
            onClick={() => {
              dismissNudge();
              onToggle();
            }}
          >
            {nudge.text}
          </button>
        </div>
      )}

      <button
        type="button"
        className={`rfc-launcher ${open ? 'rfc-launcher--open' : ''}`}
        aria-label={labels.launcherAriaLabel}
        aria-expanded={open}
        aria-controls="rfc-panel"
        onClick={() => {
          dismissNudge();
          onToggle();
        }}
      >
        <span className="rfc-launcher__icon">
          {open ? getIcon('close', icons) : getIcon('chat', icons)}
        </span>
      </button>
    </>
  );
}
