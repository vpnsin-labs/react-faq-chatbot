import type { IconSet, WhatsAppConfig, WhatsAppPlacement } from '../types';
import { getIcon } from './icons';
import { whatsappHref } from '../utils/format';

/** Placements that actually render a WhatsApp button (excludes the handoff `contact`). */
export type WhatsAppButtonPlacement = Extract<WhatsAppPlacement, 'panel' | 'launcher'>;

interface WhatsAppButtonProps {
  config: WhatsAppConfig;
  /** `panel` = inline CTA inside the chat panel; `launcher` = standalone FAB. */
  variant: WhatsAppButtonPlacement;
  icons?: IconSet;
  onActivate?: (placement: WhatsAppButtonPlacement) => void;
}

export function WhatsAppButton({ config, variant, icons, onActivate }: WhatsAppButtonProps) {
  const href = whatsappHref(config.phone, config.message);
  const label = config.label ?? 'Chat on WhatsApp';
  const glyph = getIcon('whatsapp', icons);

  if (variant === 'launcher') {
    // aria-label overrides children, so fold the new-tab cue into the label itself.
    const aria = `${config.launcherAriaLabel ?? label} (opens in a new tab)`;
    return (
      <a
        className="rfc-wa-launcher"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
        title={config.launcherAriaLabel ?? label}
        onClick={() => onActivate?.('launcher')}
      >
        <span className="rfc-wa-launcher__icon">{glyph}</span>
      </a>
    );
  }

  return (
    <a
      className="rfc-wa-cta"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onActivate?.('panel')}
    >
      <span className="rfc-wa-cta__icon">{glyph}</span>
      {label}
      <span className="rfc-visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}
