import { describe, it, expect } from 'vitest';
import { PORTAL_PRESETS, getPortalPreset } from '../src/presets';
import type { PortalType } from '../src/types';

const ALL: PortalType[] = [
  'support',
  'ecommerce',
  'saas',
  'healthcare',
  'education',
  'realestate',
  'hospitality',
];

describe('portal presets', () => {
  it('exposes every portal type', () => {
    expect(Object.keys(PORTAL_PRESETS).sort()).toEqual([...ALL].sort());
  });

  it('resolves the ecommerce preset (labels + accent + topics)', () => {
    const p = getPortalPreset('ecommerce');
    expect(p?.labels?.title).toBe('Store Help');
    expect(p?.theme?.primary).toBe('#ea580c');
    expect(p?.quickTopics?.length).toBeGreaterThan(0);
  });

  it('returns undefined for an absent type', () => {
    expect(getPortalPreset(undefined)).toBeUndefined();
  });

  it('every preset provides labels and an accent', () => {
    for (const t of ALL) {
      const p = getPortalPreset(t);
      expect(p?.labels?.title, t).toBeTruthy();
      expect(p?.theme?.primary, t).toMatch(/^#/);
    }
  });
});
