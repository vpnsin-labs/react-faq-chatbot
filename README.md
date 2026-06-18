# @vpnsin-labs/react-faq-chatbot

A small, **framework-agnostic FAQ support chatbot** widget for React. Works in
**Vite**, **Next.js**, **CRA**, Remix, Astro — anywhere React 16.8+ runs.

- 🔎 **Smart FAQ search** — token + synonym matching with confidence scoring (no exact-match brittleness).
- 🏷️ **Portal presets** — one prop tunes labels, accent and quick topics for `support`, `ecommerce`, `saas`, `healthcare`, `education`, `realestate` or `hospitality`.
- 💬 **WhatsApp chat** — opt-in deep link as a panel CTA, a standalone launcher and/or a handoff channel.
- 🤖 **Optional pluggable AI fallback** — bring your own LLM/backend; used only when no FAQ matches.
- 🎨 **Themeable, self-contained CSS** — one stylesheet, theme via CSS variables. No Tailwind required.
- 🪶 **Zero icon-library dependency** — ships tiny inline SVGs (override any of them).
- ♿ **Accessible** — dialog semantics, `aria-live` log, focus rings, reduced-motion, ESC to close.
- 💾 **Persistent threads** — `session` / `local` / `none`.
- 📦 **Tiny peer surface** — only `react` + `react-dom`.

---

## Install

```bash
npm i @vpnsin-labs/react-faq-chatbot
```

## Quick start

```tsx
import { Chatbot } from '@vpnsin-labs/react-faq-chatbot';
import '@vpnsin-labs/react-faq-chatbot/styles.css'; // import once, anywhere

const faqs = [
  { id: 1, question: 'How do I create an account?', answer: 'Click Sign Up…' },
  { id: 2, question: 'How much does it cost?', answer: 'Plans start at $9/mo…' },
];

export default function App() {
  return <Chatbot faqs={faqs} labels={{ title: 'Support' }} />;
}
```

That's it — a floating launcher appears bottom-right.

> **Next.js:** the widget uses browser APIs, so render it from a Client
> Component (`"use client"`). See [`examples/nextjs-app.tsx`](./examples/nextjs-app.tsx).

---

## Portal presets

Tailor the widget to a portal type with a single `preset` prop. Each preset
seeds **tuned default labels, an accent theme and starter quick topics** for that
domain — and **every piece stays overridable** (any `labels`, `theme` or
`quickTopics` you pass wins over the preset).

```tsx
<Chatbot faqs={faqs} preset="ecommerce" />
// → "Store Help", orange accent, topics: Track my order / Returns & refunds / …

<Chatbot
  faqs={faqs}
  preset="healthcare"
  labels={{ title: 'Acme Clinic' }} // override just the title; keep the rest
/>
```

Available presets: `support` · `ecommerce` · `saas` · `healthcare` · `education`
· `realestate` · `hospitality`. Read or extend them via the exported
`PORTAL_PRESETS` map.

### Organising a large knowledge base

`FAQItem` accepts two optional fields for portals with big or jargon-heavy FAQs:

```tsx
const faqs = [
  {
    id: 1,
    question: 'How do I reset my password?',
    answer: 'Use the “Forgot password” link on the sign-in page.',
    category: 'Account', // shown as a tag on suggestions
    keywords: ['login', 'credentials', 'cant sign in'], // extra search terms
  },
];
```

- **`category`** groups entries and renders as a small tag on the "did you mean" suggestions.
- **`keywords`** are author-curated aliases (synonyms, product names, common misspellings) indexed at question weight, so users find the entry even when their words aren't in the question.

---

## Theming

Override any [`--rfc-*` token](./src/styles.css) inline via the `theme` prop:

```tsx
<Chatbot faqs={faqs} theme={{ primary: '#7c3aed', radius: '12px', panelWidth: '400px' }} />
```

**Dark mode** follows the OS preference automatically. Force it by setting
`data-rfc-theme="dark"` (or `"light"`) on the widget or any ancestor element.

You can also override tokens in your own CSS:

```css
.rfc-root {
  --rfc-primary: #16a34a;
}
```

---

## AI fallback (optional)

When the FAQ search finds no confident match, the widget calls your `aiAdapter`.
Keep API keys on the server — point the adapter at your own endpoint:

```tsx
import type { AiAdapter } from '@vpnsin-labs/react-faq-chatbot';

const aiAdapter: AiAdapter = async ({ message, history, faqContext }) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, faqContext }),
  });
  if (!res.ok) return null; // null → falls back to the contact card
  return (await res.json()).answer;
};

<Chatbot faqs={faqs} aiAdapter={aiAdapter} />;
```

`faqContext` contains the top-ranked FAQ entries for the query — use them to
ground the model (RAG-style). If `aiAdapter` is omitted, the widget is pure
search + contact handoff (no backend needed).

---

## Quick topics & contact handoff

```tsx
import { Chatbot, CONTACT_INTENT } from '@vpnsin-labs/react-faq-chatbot';

<Chatbot
  faqs={faqs}
  quickTopics={[
    { label: 'Pricing', seed: 'pricing plans cost' },
    { label: 'Talk to us', seed: CONTACT_INTENT }, // opens the contact card
  ]}
  contactChannels={[
    { type: 'email', label: 'Email us', value: 'support@acme.com' },
    { type: 'phone', label: 'Call us', value: '+1 555 010 2030' },
    { type: 'whatsapp', label: 'WhatsApp', value: '+1 555 010 2030', prefill: 'Hi!' },
    { type: 'link', label: 'Help center', value: 'https://help.acme.com' },
  ]}
/>;
```

## WhatsApp chat

Let users continue in WhatsApp with the `whatsapp` prop. It builds a
`https://wa.me/<number>` deep link (with an optional pre-filled message) and can
surface in up to three places via `placement`:

```tsx
<Chatbot
  faqs={faqs}
  whatsapp={{
    phone: '+1 555 010 2030',
    message: 'Hi! I have a question about my order.',
    label: 'Chat on WhatsApp', // optional button copy
    placement: ['panel', 'launcher'], // default: "panel"
  }}
/>
```

| Placement    | Where it shows                                                             |
| ------------ | -------------------------------------------------------------------------- |
| `"panel"`    | a persistent "Chat on WhatsApp" button above the composer _(default)_      |
| `"launcher"` | a standalone WhatsApp button stacked above the chat launcher               |
| `"contact"`  | added as a channel in the human-handoff card (deduped if you add your own) |

The button colour follows the `--rfc-whatsapp` / `--rfc-whatsapp-foreground`
tokens (an accessible green with white text by default, clearing WCAG AA). Use
the classic brand green with `theme={{ whatsapp: '#25d366', whatsappForeground: '#05330f' }}`.
Clicks emit a `whatsapp_clicked` event via `onEvent`.

## Domain synonyms

Improve recall for your jargon (merged over the built-in defaults):

```tsx
<Chatbot
  faqs={faqs}
  synonyms={{ moq: ['minimum', 'order', 'quantity'], sku: ['item', 'product'] }}
/>
```

---

## Props

| Prop                    | Type                                                 | Default          | Description                                                                                                       |
| ----------------------- | ---------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `faqs`                  | `FAQItem[] \| () => FAQItem[] \| Promise<FAQItem[]>` | —                | **Required.** Knowledge base (array or async loader).                                                             |
| `preset`                | `PortalType`                                         | —                | Portal flavour seeding labels/theme/topics (e.g. `"ecommerce"`). Explicit props override it.                      |
| `aiAdapter`             | `AiAdapter`                                          | —                | Optional AI fallback when no FAQ matches.                                                                         |
| `synonyms`              | `Record<string,string[]>`                            | built-ins        | Domain vocabulary expansion.                                                                                      |
| `quickTopics`           | `QuickTopic[]`                                       | preset / `[]`    | Starter chips on a fresh thread.                                                                                  |
| `contactChannels`       | `ContactChannel[]`                                   | `[]`             | Human-handoff card links.                                                                                         |
| `whatsapp`              | `WhatsAppConfig`                                     | —                | Enable WhatsApp chat (panel CTA, launcher and/or handoff channel).                                                |
| `labels`                | `Partial<ChatbotLabels>`                             | English defaults | Copy overrides.                                                                                                   |
| `theme`                 | `ChatbotTheme`                                       | —                | `--rfc-*` CSS-variable overrides.                                                                                 |
| `position`              | `"bottom-right" \| "bottom-left"`                    | `"bottom-right"` | Dock corner.                                                                                                      |
| `persistence`           | `"session" \| "local" \| "none"`                     | `"session"`      | Where to persist the thread.                                                                                      |
| `storageKey`            | `string`                                             | `"rfc.chat.v1"`  | Persistence key.                                                                                                  |
| `defaultOpen`           | `boolean`                                            | `false`          | Start open.                                                                                                       |
| `open` / `onOpenChange` | `boolean` / `(b)=>void`                              | —                | Controlled open state.                                                                                            |
| `showLauncher`          | `boolean`                                            | `true`           | Render the floating button.                                                                                       |
| `typingDelayMs`         | `number`                                             | `600`            | Simulated reply delay.                                                                                            |
| `nudge`                 | `{ text; delayMs? } \| false`                        | —                | One-time welcome bubble.                                                                                          |
| `confidence`            | `{ answerCoverage?; suggestCount? }`                 | —                | Search resolver tuning.                                                                                           |
| `onEvent`               | `(e: ChatbotEvent) => void`                          | —                | Analytics hook (`open`, `message_sent`, `faq_answered`, `ai_answered`, `contact_clicked`, `whatsapp_clicked`, …). |
| `icons`                 | `IconSet`                                            | inline SVGs      | Override any glyph.                                                                                               |

---

## Headless usage

Build your own UI on the engine:

```tsx
import { searchFAQs, resolveFaqQuery, useChatbot } from '@vpnsin-labs/react-faq-chatbot';

const hits = searchFAQs('how do i pay', faqs); // ScoredFAQ[]
const result = resolveFaqQuery('how do i pay', faqs); // answer | suggestions | none
```

---

## Development

```bash
npm install
npm test            # Vitest unit + component suite (search, presets, WhatsApp, UI)
npm run build       # bundle to dist/ with tsup
```

For a real-browser visual check, the [`examples/playground`](./examples/playground)
Vite app renders the widget against the built `dist/` (with an optional
puppeteer screenshot driver). See its [README](./examples/playground/README.md).

---

## License

MIT © vpnsin-labs
