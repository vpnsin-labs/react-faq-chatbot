import type { AiAdapter, AiAdapterParams, ChatTurn, FAQItem } from './types';

// ---------------------------------------------------------------------------
// Built-in AI provider adapters
//
// Ready-made `AiAdapter` factories for the popular hosted LLM APIs — Anthropic
// Claude, Google Gemini, OpenAI ChatGPT and xAI Grok — so wiring the AI
// fallback is one line: pass an API key, get an adapter.
//
//   <Chatbot faqs={faqs} aiAdapter={createClaudeAdapter({ apiKey })} />
//
// ⚠ Security: calling a provider directly from the browser exposes the API key
// to anyone who opens dev-tools. That is fine for prototypes and internal
// tools; for production traffic put the key behind your own endpoint and set
// `baseUrl` to it (every factory supports this), or hand-roll an `AiAdapter`
// against your backend. Browser usage must be opted into explicitly via
// `dangerouslyAllowBrowser: true`.
// ---------------------------------------------------------------------------

/** Providers with a built-in adapter. */
export type AiProviderName = 'claude' | 'gemini' | 'chatgpt' | 'grok';

/** Sentinel the model is instructed to reply with when the answer is unknown. */
export const AI_NO_ANSWER = 'NO_ANSWER';

/** Default model per provider — override with `model` (pin one in production). */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  claude: 'claude-sonnet-4-5',
  gemini: 'gemini-2.5-flash',
  chatgpt: 'gpt-5-mini',
  grok: 'grok-4',
};

/** Options shared by every provider factory. */
export interface AiProviderOptions {
  /**
   * Provider API key. Never hard-code it — read it from your build-time env
   * (e.g. `import.meta.env.VITE_ANTHROPIC_API_KEY` in Vite,
   * `process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY` in Next.js) or, better, keep it
   * server-side behind a `baseUrl` proxy.
   */
  apiKey: string;
  /** Model ID. Defaults to {@link DEFAULT_AI_MODELS} for the provider. */
  model?: string;
  /**
   * Override the API origin — point this at your own proxy/edge function to
   * keep the key off the client, or at a compatible gateway. The provider's
   * request path is appended to it.
   */
  baseUrl?: string;
  /** Max tokens to generate. Default 400. */
  maxTokens?: number;
  /** Sampling temperature. Default 0.2 (support answers should be boring). */
  temperature?: number;
  /**
   * Replace the built-in grounding prompt. A string is used verbatim; a
   * function receives the adapter params (message, history, faqContext) and
   * returns the system prompt for that call.
   */
  systemPrompt?: string | ((params: AiAdapterParams) => string);
  /**
   * Acknowledge that running this adapter in a browser ships the API key to
   * every visitor. Without it the adapter still works but logs a console
   * warning when it detects a browser environment.
   */
  dangerouslyAllowBrowser?: boolean;
  /** Extra headers merged into every request (e.g. proxy auth). */
  headers?: Record<string, string>;
  /** Custom fetch implementation (tests, polyfills, instrumentation). */
  fetchFn?: typeof fetch;
  /** Abort/latency guard for the HTTP call, ms. Default 30000. */
  timeoutMs?: number;
}

/** Full configuration: an {@link AiProviderName} plus the shared options. */
export interface AiProviderConfig extends AiProviderOptions {
  provider: AiProviderName;
}

/** Thrown when the provider responds with a non-2xx status. */
export class AiProviderError extends Error {
  readonly provider: AiProviderName;
  readonly status: number;

  constructor(provider: AiProviderName, status: number, detail: string) {
    super(`[react-faq-chatbot] ${provider} request failed (HTTP ${status}): ${detail}`);
    this.name = 'AiProviderError';
    this.provider = provider;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Grounding prompt
// ---------------------------------------------------------------------------

/**
 * Default system prompt: ground the model in the FAQ context (RAG-style) and
 * give it an unambiguous "I don't know" escape hatch we can detect.
 */
export function buildGroundingPrompt(faqContext: FAQItem[]): string {
  const kb = faqContext.map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join('\n');
  return [
    'You are a concise, friendly customer-support assistant embedded in a website chat widget.',
    'Answer the user using ONLY the FAQ knowledge base below. You may rephrase and combine entries, but never invent policies, prices, links or facts that are not in it.',
    `If the knowledge base does not cover the question, reply with exactly ${AI_NO_ANSWER} and nothing else.`,
    'Keep answers under 120 words. Plain text only — no markdown headings or code fences.',
    '',
    'FAQ knowledge base:',
    kb || '(empty)',
  ].join('\n');
}

function resolveSystemPrompt(
  opt: AiProviderOptions['systemPrompt'],
  params: AiAdapterParams
): string {
  if (typeof opt === 'function') return opt(params);
  if (typeof opt === 'string') return opt;
  return buildGroundingPrompt(params.faqContext);
}

/** `null` when the model declined (sentinel / empty) so the widget can hand off. */
function postProcess(text: string | undefined | null): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (
    trimmed
      .replace(/[.!\s]+$/u, '')
      .toUpperCase()
      .endsWith(AI_NO_ANSWER)
  )
    return null;
  return trimmed;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function warnBrowserKey(provider: AiProviderName, allowed?: boolean): void {
  if (allowed || !isBrowser()) return;
  console.warn(
    `[react-faq-chatbot] The ${provider} adapter is running in the browser, which exposes your API key to visitors. ` +
      'Route calls through your backend via `baseUrl`, or pass `dangerouslyAllowBrowser: true` to acknowledge the risk.'
  );
}

async function post(
  provider: AiProviderName,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  opts: AiProviderOptions
): Promise<unknown> {
  const doFetch = opts.fetchFn ?? fetch;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = controller
    ? setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000)
    : undefined;
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers, ...opts.headers },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new AiProviderError(provider, res.status, detail.slice(0, 500));
    }
    return (await res.json()) as unknown;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const trimBase = (url: string) => url.replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Anthropic Claude
// ---------------------------------------------------------------------------

interface ClaudeResponse {
  content?: { type: string; text?: string }[];
}

/** Adapter for the Anthropic Messages API (`claude` models). */
export function createClaudeAdapter(options: AiProviderOptions): AiAdapter {
  warnBrowserKey('claude', options.dangerouslyAllowBrowser);
  const base = trimBase(options.baseUrl ?? 'https://api.anthropic.com');
  const model = options.model ?? DEFAULT_AI_MODELS.claude;

  return async (params) => {
    const headers: Record<string, string> = {
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    };
    if (options.dangerouslyAllowBrowser) {
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
    const data = (await post(
      'claude',
      `${base}/v1/messages`,
      headers,
      {
        model,
        max_tokens: options.maxTokens ?? 400,
        temperature: options.temperature ?? 0.2,
        system: resolveSystemPrompt(options.systemPrompt, params),
        messages: [
          ...params.history.map((t) => ({ role: t.role, content: t.content })),
          { role: 'user', content: params.message },
        ],
      },
      options
    )) as ClaudeResponse;

    const text = data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    return postProcess(text);
  };
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat completions (ChatGPT, Grok)
// ---------------------------------------------------------------------------

interface ChatCompletionsResponse {
  choices?: { message?: { content?: string | null } }[];
}

function createChatCompletionsAdapter(
  provider: Extract<AiProviderName, 'chatgpt' | 'grok'>,
  defaultBase: string,
  options: AiProviderOptions
): AiAdapter {
  warnBrowserKey(provider, options.dangerouslyAllowBrowser);
  const base = trimBase(options.baseUrl ?? defaultBase);
  const model = options.model ?? DEFAULT_AI_MODELS[provider];

  return async (params) => {
    const data = (await post(
      provider,
      `${base}/v1/chat/completions`,
      { Authorization: `Bearer ${options.apiKey}` },
      {
        model,
        max_tokens: options.maxTokens ?? 400,
        temperature: options.temperature ?? 0.2,
        messages: [
          { role: 'system', content: resolveSystemPrompt(options.systemPrompt, params) },
          ...params.history.map((t: ChatTurn) => ({ role: t.role, content: t.content })),
          { role: 'user', content: params.message },
        ],
      },
      options
    )) as ChatCompletionsResponse;

    return postProcess(data.choices?.[0]?.message?.content);
  };
}

/** Adapter for the OpenAI Chat Completions API (`gpt` models / ChatGPT). */
export function createChatGptAdapter(options: AiProviderOptions): AiAdapter {
  return createChatCompletionsAdapter('chatgpt', 'https://api.openai.com', options);
}

/** Alias of {@link createChatGptAdapter} for those who know it as "the OpenAI API". */
export const createOpenAiAdapter = createChatGptAdapter;

/** Adapter for the xAI API (`grok` models — OpenAI-compatible). */
export function createGrokAdapter(options: AiProviderOptions): AiAdapter {
  return createChatCompletionsAdapter('grok', 'https://api.x.ai', options);
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** Adapter for the Google Gemini `generateContent` API. */
export function createGeminiAdapter(options: AiProviderOptions): AiAdapter {
  warnBrowserKey('gemini', options.dangerouslyAllowBrowser);
  const base = trimBase(options.baseUrl ?? 'https://generativelanguage.googleapis.com');
  const model = options.model ?? DEFAULT_AI_MODELS.gemini;

  return async (params) => {
    const data = (await post(
      'gemini',
      `${base}/v1beta/models/${model}:generateContent`,
      { 'x-goog-api-key': options.apiKey },
      {
        systemInstruction: {
          parts: [{ text: resolveSystemPrompt(options.systemPrompt, params) }],
        },
        contents: [
          ...params.history.map((t) => ({
            role: t.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: t.content }],
          })),
          { role: 'user', parts: [{ text: params.message }] },
        ],
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 400,
          temperature: options.temperature ?? 0.2,
        },
      },
      options
    )) as GeminiResponse;

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
    return postProcess(text);
  };
}

// ---------------------------------------------------------------------------
// Generic factory
// ---------------------------------------------------------------------------

const FACTORIES: Record<AiProviderName, (o: AiProviderOptions) => AiAdapter> = {
  claude: createClaudeAdapter,
  gemini: createGeminiAdapter,
  chatgpt: createChatGptAdapter,
  grok: createGrokAdapter,
};

/**
 * Create an adapter from a plain config object — handy when the provider name
 * comes from configuration rather than code:
 *
 *   const adapter = createAiAdapter({ provider: 'gemini', apiKey });
 *
 * Equivalent to calling the matching `create*Adapter` factory. Also powers the
 * `ai` prop on `<Chatbot />`.
 */
export function createAiAdapter(config: AiProviderConfig): AiAdapter {
  const { provider, ...options } = config;
  const factory = FACTORIES[provider];
  if (!factory) {
    throw new Error(
      `[react-faq-chatbot] Unknown AI provider "${String(provider)}". ` +
        `Expected one of: ${Object.keys(FACTORIES).join(', ')}.`
    );
  }
  return factory(options);
}
