import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AI_NO_ANSWER,
  AiProviderError,
  DEFAULT_AI_MODELS,
  buildGroundingPrompt,
  createAiAdapter,
  createChatGptAdapter,
  createClaudeAdapter,
  createGeminiAdapter,
  createGrokAdapter,
  createOpenAiAdapter,
} from '../src/aiProviders';
import type { AiAdapterParams } from '../src/types';

const PARAMS: AiAdapterParams = {
  message: 'Can I pay with iDEAL?',
  history: [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'Hello! How can I help?' },
  ],
  faqContext: [{ question: 'What payment methods do you accept?', answer: 'Cards and PayPal.' }],
};

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchReturning(payload: unknown, status = 200): FetchMock {
  return vi.fn(async () => jsonResponse(payload, status));
}

/** The request-body fields these tests assert on. */
interface CapturedBody {
  model?: string;
  system?: string;
  messages?: { role: string; content: string }[];
  systemInstruction?: { parts: { text: string }[] };
  contents?: { role: string; parts: { text: string }[] }[];
}

function requestOf(fetchFn: FetchMock): { url: string; init: RequestInit; body: CapturedBody } {
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)) as CapturedBody };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildGroundingPrompt', () => {
  it('embeds the FAQ context and the no-answer sentinel', () => {
    const prompt = buildGroundingPrompt(PARAMS.faqContext);
    expect(prompt).toContain('What payment methods do you accept?');
    expect(prompt).toContain('Cards and PayPal.');
    expect(prompt).toContain(AI_NO_ANSWER);
  });
});

describe('createClaudeAdapter', () => {
  it('calls the Anthropic Messages API and returns the text', async () => {
    const fetchFn = fetchReturning({
      content: [{ type: 'text', text: 'Yes — cards and PayPal.' }],
    });
    const adapter = createClaudeAdapter({ apiKey: 'sk-ant-test', fetchFn });

    await expect(adapter(PARAMS)).resolves.toBe('Yes — cards and PayPal.');

    const { url, init, body } = requestOf(fetchFn);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test');
    expect((init.headers as Record<string, string>)['anthropic-version']).toBeTruthy();
    expect(body.model).toBe(DEFAULT_AI_MODELS.claude);
    expect(body.system).toContain('FAQ knowledge base');
    // history turns + the new user message
    expect(body.messages).toHaveLength(3);
    expect(body.messages?.at(-1)).toEqual({ role: 'user', content: PARAMS.message });
  });

  it('returns null when the model replies with the sentinel', async () => {
    const fetchFn = fetchReturning({ content: [{ type: 'text', text: ` ${AI_NO_ANSWER}. ` }] });
    const adapter = createClaudeAdapter({ apiKey: 'k', fetchFn });
    await expect(adapter(PARAMS)).resolves.toBeNull();
  });

  it('throws AiProviderError on a non-2xx response', async () => {
    const fetchFn = fetchReturning({ error: 'nope' }, 401);
    const adapter = createClaudeAdapter({ apiKey: 'bad', fetchFn });
    await expect(adapter(PARAMS)).rejects.toMatchObject({
      name: 'AiProviderError',
      provider: 'claude',
      status: 401,
    });
    await expect(
      createClaudeAdapter({ apiKey: 'bad', fetchFn: fetchReturning({}, 500) })(PARAMS)
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it('warns when given a browser key without dangerouslyAllowBrowser', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createClaudeAdapter({ apiKey: 'k', fetchFn: fetchReturning({}) });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockClear();
    createClaudeAdapter({
      apiKey: 'k',
      fetchFn: fetchReturning({}),
      dangerouslyAllowBrowser: true,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('sends the direct-browser-access header when opted in', async () => {
    const fetchFn = fetchReturning({ content: [] });
    await createClaudeAdapter({ apiKey: 'k', fetchFn, dangerouslyAllowBrowser: true })(PARAMS);
    const { init } = requestOf(fetchFn);
    expect(
      (init.headers as Record<string, string>)['anthropic-dangerous-direct-browser-access']
    ).toBe('true');
  });
});

describe('createChatGptAdapter / createGrokAdapter (chat-completions)', () => {
  it('calls the OpenAI endpoint with a bearer token and system prompt first', async () => {
    const fetchFn = fetchReturning({ choices: [{ message: { content: 'Cards and PayPal.' } }] });
    const adapter = createChatGptAdapter({ apiKey: 'sk-test', fetchFn });

    await expect(adapter(PARAMS)).resolves.toBe('Cards and PayPal.');

    const { url, init, body } = requestOf(fetchFn);
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(body.model).toBe(DEFAULT_AI_MODELS.chatgpt);
    expect(body.messages?.[0].role).toBe('system');
    expect(body.messages?.at(-1)).toEqual({ role: 'user', content: PARAMS.message });
  });

  it('exposes createOpenAiAdapter as an alias', () => {
    expect(createOpenAiAdapter).toBe(createChatGptAdapter);
  });

  it('sends Grok calls to api.x.ai with the grok default model', async () => {
    const fetchFn = fetchReturning({ choices: [{ message: { content: 'hi' } }] });
    await createGrokAdapter({ apiKey: 'xai-test', fetchFn })(PARAMS);
    const { url, body } = requestOf(fetchFn);
    expect(url).toBe('https://api.x.ai/v1/chat/completions');
    expect(body.model).toBe(DEFAULT_AI_MODELS.grok);
  });

  it('honours baseUrl overrides (key-hiding proxy pattern)', async () => {
    const fetchFn = fetchReturning({ choices: [{ message: { content: 'ok' } }] });
    await createChatGptAdapter({ apiKey: 'k', baseUrl: 'https://ai.example.com/', fetchFn })(
      PARAMS
    );
    expect(requestOf(fetchFn).url).toBe('https://ai.example.com/v1/chat/completions');
  });

  it('returns null on an empty completion', async () => {
    const fetchFn = fetchReturning({ choices: [{ message: { content: '   ' } }] });
    await expect(createChatGptAdapter({ apiKey: 'k', fetchFn })(PARAMS)).resolves.toBeNull();
  });
});

describe('createGeminiAdapter', () => {
  it('calls generateContent with mapped roles and returns the candidate text', async () => {
    const fetchFn = fetchReturning({
      candidates: [{ content: { parts: [{ text: 'Cards ' }, { text: 'and PayPal.' }] } }],
    });
    const adapter = createGeminiAdapter({ apiKey: 'g-test', fetchFn, model: 'gemini-2.5-flash' });

    await expect(adapter(PARAMS)).resolves.toBe('Cards and PayPal.');

    const { url, init, body } = requestOf(fetchFn);
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('g-test');
    expect(body.systemInstruction?.parts[0].text).toContain('FAQ knowledge base');
    // assistant history turns become `model` role
    expect(body.contents?.[1].role).toBe('model');
    expect(body.contents?.at(-1)).toEqual({ role: 'user', parts: [{ text: PARAMS.message }] });
  });
});

describe('createAiAdapter', () => {
  it('routes each provider name to the matching factory endpoint', async () => {
    const cases: Record<string, string> = {
      claude: 'https://api.anthropic.com/v1/messages',
      chatgpt: 'https://api.openai.com/v1/chat/completions',
      grok: 'https://api.x.ai/v1/chat/completions',
      gemini: `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_AI_MODELS.gemini}:generateContent`,
    };
    for (const [provider, endpoint] of Object.entries(cases)) {
      const fetchFn = fetchReturning({});
      const adapter = createAiAdapter({
        provider: provider as never,
        apiKey: 'k',
        fetchFn,
        dangerouslyAllowBrowser: true,
      });
      await adapter(PARAMS);
      expect(requestOf(fetchFn).url, provider).toBe(endpoint);
    }
  });

  it('throws on an unknown provider', () => {
    expect(() => createAiAdapter({ provider: 'llama' as never, apiKey: 'k' })).toThrow(
      /Unknown AI provider/
    );
  });
});
