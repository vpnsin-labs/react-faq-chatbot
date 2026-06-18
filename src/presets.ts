// ---------------------------------------------------------------------------
// Portal presets
// ---------------------------------------------------------------------------
// Ready-made defaults for common portal flavours. Selecting a `preset` seeds
// tuned labels, an accent theme and starter quick topics — each still
// overridable by the matching explicit prop. Presets only set copy/colour/
// topics; they never assume a knowledge base, so they compose with any `faqs`.
// ---------------------------------------------------------------------------

import { CONTACT_INTENT, type PortalPreset, type PortalType } from './types';

/** Defaults keyed by {@link PortalType}. Exported so apps can read/extend them. */
export const PORTAL_PRESETS: Record<PortalType, PortalPreset> = {
  support: {
    labels: {
      title: 'Support',
      subtitle: 'Typically replies instantly',
      greeting: 'Hi! 👋 How can we help you today?',
      quickTopicsHeading: 'Popular topics',
    },
    theme: { primary: '#2563eb' },
    quickTopics: [
      { label: 'Getting started', seed: 'getting started setup' },
      { label: 'Account & login', seed: 'account login password reset' },
      { label: 'Billing', seed: 'billing payment invoice' },
      { label: 'Talk to a human', seed: CONTACT_INTENT },
    ],
  },

  ecommerce: {
    labels: {
      title: 'Store Help',
      subtitle: 'Orders, shipping & returns',
      greeting: 'Hi there! 🛍️ Need a hand with an order?',
      placeholder: 'Ask about orders, shipping…',
      quickTopicsHeading: 'How can we help?',
    },
    theme: { primary: '#ea580c' },
    quickTopics: [
      { label: 'Track my order', seed: 'track order status delivery where' },
      { label: 'Returns & refunds', seed: 'return refund exchange policy' },
      { label: 'Shipping & delivery', seed: 'shipping delivery time cost' },
      { label: 'Payment & promos', seed: 'payment methods discount coupon promo' },
    ],
  },

  saas: {
    labels: {
      title: 'Product Help',
      subtitle: 'Answers from our docs',
      greeting: 'Hey! 👋 What can I help you build today?',
      placeholder: 'Search the docs…',
      quickTopicsHeading: 'Quick links',
    },
    theme: { primary: '#6d28d9' },
    quickTopics: [
      { label: 'Getting started', seed: 'getting started setup onboarding' },
      { label: 'Plans & billing', seed: 'pricing plans billing subscription upgrade' },
      { label: 'Integrations', seed: 'integration connect webhook' },
      { label: 'API & docs', seed: 'api documentation reference token' },
    ],
  },

  healthcare: {
    labels: {
      title: 'Patient Support',
      subtitle: "We're here to help",
      greeting: 'Hello 👋 How can we support you today?',
      placeholder: 'Ask about appointments, billing…',
      noMatch: "I couldn't find that. Would you like to reach our care team?",
      quickTopicsHeading: 'Common requests',
    },
    theme: { primary: '#0d9488' },
    quickTopics: [
      { label: 'Book an appointment', seed: 'book appointment schedule visit' },
      { label: 'Insurance & billing', seed: 'insurance billing coverage cost' },
      { label: 'Prescriptions', seed: 'prescription refill medication' },
      { label: 'Speak to the team', seed: CONTACT_INTENT },
    ],
  },

  education: {
    labels: {
      title: 'Student Help',
      subtitle: 'Admissions, courses & more',
      greeting: 'Hi! 🎓 What would you like to know?',
      placeholder: 'Ask about courses, fees…',
      quickTopicsHeading: 'Popular questions',
    },
    theme: { primary: '#0284c7' },
    quickTopics: [
      { label: 'Admissions', seed: 'admission apply enrollment requirements' },
      { label: 'Courses & programs', seed: 'courses programs curriculum schedule' },
      { label: 'Fees & scholarships', seed: 'fees tuition scholarship financial aid' },
      { label: 'Login help', seed: 'login portal password account' },
    ],
  },

  realestate: {
    labels: {
      title: 'Property Help',
      subtitle: 'Listings, viewings & pricing',
      greeting: 'Hi! 🏡 Looking for your next place?',
      placeholder: 'Ask about listings, viewings…',
      quickTopicsHeading: 'How can we help?',
    },
    theme: { primary: '#059669' },
    quickTopics: [
      { label: 'Browse listings', seed: 'listings properties available for sale rent' },
      { label: 'Schedule a viewing', seed: 'schedule viewing tour visit appointment' },
      { label: 'Pricing & offers', seed: 'price offer negotiation valuation' },
      { label: 'Documents & process', seed: 'documents paperwork process mortgage' },
    ],
  },

  hospitality: {
    labels: {
      title: 'Guest Services',
      subtitle: 'Bookings & concierge',
      greeting: 'Welcome! 🛎️ How may we assist you?',
      placeholder: 'Ask about rooms, amenities…',
      quickTopicsHeading: 'Guest services',
    },
    theme: { primary: '#b45309' },
    quickTopics: [
      { label: 'Book a room', seed: 'book room reservation availability' },
      { label: 'Amenities', seed: 'amenities wifi pool parking breakfast' },
      { label: 'Check-in & check-out', seed: 'check in check out time policy' },
      { label: 'Concierge', seed: CONTACT_INTENT },
    ],
  },
};

/** Resolve a preset by type (returns `undefined` for an unknown/absent type). */
export function getPortalPreset(type?: PortalType): PortalPreset | undefined {
  return type ? PORTAL_PRESETS[type] : undefined;
}
