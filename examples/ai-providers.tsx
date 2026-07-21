// AI fallback with the built-in provider adapters (Claude, Gemini, ChatGPT, Grok).
//
// The widget answers from your FAQs first; only when no confident match exists
// does it call the configured AI provider, grounded in the top-ranked entries.
//
// Put keys in your env, never in source:
//   Vite:    VITE_ANTHROPIC_API_KEY=sk-ant-…      → import.meta.env.VITE_ANTHROPIC_API_KEY
//   Next.js: NEXT_PUBLIC_GEMINI_API_KEY=…         → process.env.NEXT_PUBLIC_GEMINI_API_KEY
//
// ⚠️ Any key bundled into browser code is visible to visitors — fine for
// prototypes/internal tools (opt in with `dangerouslyAllowBrowser`), but for
// production keep the key behind your own endpoint and use `baseUrl` (see the
// proxy variant at the bottom).

import {
  Chatbot,
  createAiAdapter,
  createClaudeAdapter,
  createGeminiAdapter,
  createChatGptAdapter,
  createGrokAdapter,
} from '@vpnsin-labs/react-faq-chatbot';
import '@vpnsin-labs/react-faq-chatbot/styles.css';
import { faqs } from './faqs.sample';

// --- Option 1: declarative `ai` prop (simplest) -----------------------------

export function SupportChatClaude() {
  return (
    <Chatbot
      faqs={faqs}
      ai={{
        provider: 'claude', // 'claude' | 'gemini' | 'chatgpt' | 'grok'
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true, // prototype only — see proxy variant below
      }}
    />
  );
}

// --- Option 2: explicit adapter factories -----------------------------------

const claude = createClaudeAdapter({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
  dangerouslyAllowBrowser: true,
});

const gemini = createGeminiAdapter({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  model: 'gemini-2.5-flash',
  dangerouslyAllowBrowser: true,
});

const chatgpt = createChatGptAdapter({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  model: 'gpt-5-mini',
  dangerouslyAllowBrowser: true,
});

const grok = createGrokAdapter({
  apiKey: import.meta.env.VITE_XAI_API_KEY,
  model: 'grok-4',
  dangerouslyAllowBrowser: true,
});

export function SupportChatPickOne() {
  // Swap in whichever adapter you want the fallback to use.
  void gemini;
  void chatgpt;
  void grok;
  return <Chatbot faqs={faqs} aiAdapter={claude} />;
}

// --- Option 3: provider from config, key held by YOUR server (production) ---

// A tiny pass-through route (e.g. /api/ai/v1/messages → api.anthropic.com/v1/messages)
// adds the real key server-side; the client ships no secret at all.
const productionAdapter = createAiAdapter({
  provider: 'claude',
  apiKey: '', // injected by the proxy — nothing sensitive in the bundle
  baseUrl: 'https://your-app.example.com/api/ai',
});

export function SupportChatProduction() {
  return <Chatbot faqs={faqs} aiAdapter={productionAdapter} />;
}
