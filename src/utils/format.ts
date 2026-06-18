import type { ContactChannel } from '../types';

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Build a `https://wa.me/<number>` deep link. Strips non-digits from the number
 * (so `+1 (555) 010` works) and URL-encodes the optional pre-filled message.
 */
export function whatsappHref(phone: string, message?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

/** Build the appropriate href for a contact channel. */
export function contactHref(channel: ContactChannel): string {
  switch (channel.type) {
    case 'email': {
      const subject = channel.prefill ? `?subject=${encodeURIComponent(channel.prefill)}` : '';
      return `mailto:${channel.value}${subject}`;
    }
    case 'phone':
      return `tel:${channel.value.replace(/[^\d+]/g, '')}`;
    case 'whatsapp':
      return whatsappHref(channel.value, channel.prefill);
    case 'link':
    default:
      return channel.value;
  }
}

export function iconNameForChannel(
  channel: ContactChannel
): 'email' | 'phone' | 'whatsapp' | 'link' {
  return channel.type === 'email'
    ? 'email'
    : channel.type === 'phone'
      ? 'phone'
      : channel.type === 'whatsapp'
        ? 'whatsapp'
        : 'link';
}
