import type { IconSet, WhatsAppConfig, WhatsAppPlacement } from '../types';
import { getIcon } from './icons';
import { whatsappHref } from '../utils/format';

interface WhatsAppButtonProps {
  config: WhatsAppConfig;
  /** `panel` = inline CTA inside the chat panel; `launcher` = standalone FAB. */
  variant: Extract<WhatsAppPlacement, 'panel' | 'launcher'>;
  icons?: IconSet;
  onActivate?: (placement: WhatsAppPlacement) => void;
}

export function WhatsAppButton({ config, variant, icons, onActivate }: WhatsAppButtonProps) {
  const href = whatsappHref(config.phone, config.message);
  const label = config.label ?? 'Chat on WhatsApp';
  const glyph = getIcon('whatsapp', icons);

  if (variant === 'launcher') {
    const aria = config.launcherAriaLabel ?? label;
    return (
      <a
        className="rfc-wa-launcher"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
        title={aria}
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
    </a>
  );
}
