import { describe, it, expect } from 'vitest';
import { whatsappHref, contactHref } from '../src/utils/format';

describe('whatsappHref', () => {
  it('strips formatting to digits', () => {
    expect(whatsappHref('+1 (555) 010-2030')).toBe('https://wa.me/15550102030');
  });

  it('strips a leading 00 international trunk prefix', () => {
    expect(whatsappHref('0044 7700 900123')).toBe('https://wa.me/447700900123');
  });

  it('url-encodes the pre-filled message', () => {
    expect(whatsappHref('15550102030', 'Hi there!')).toBe(
      'https://wa.me/15550102030?text=Hi%20there!'
    );
  });
});

describe('contactHref', () => {
  it('builds a mailto with an optional subject', () => {
    expect(
      contactHref({ type: 'email', label: 'Email', value: 'a@b.com', prefill: 'Help me' })
    ).toBe('mailto:a@b.com?subject=Help%20me');
  });

  it('builds a tel link', () => {
    expect(contactHref({ type: 'phone', label: 'Call', value: '+1 555 010 2030' })).toBe(
      'tel:+15550102030'
    );
  });

  it('builds a wa.me link for whatsapp channels', () => {
    expect(
      contactHref({ type: 'whatsapp', label: 'WA', value: '+1 555 010 2030', prefill: 'Hi' })
    ).toBe('https://wa.me/15550102030?text=Hi');
  });

  it('passes a link channel through unchanged', () => {
    expect(contactHref({ type: 'link', label: 'Docs', value: 'https://x.dev' })).toBe(
      'https://x.dev'
    );
  });
});
