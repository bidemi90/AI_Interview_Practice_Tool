import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/environment.js', () => ({
  env: {
    clientUrl: 'http://localhost:5173',
    openRouter: {
      apiKey: 'test-key', model: 'openrouter/free', baseUrl: 'https://openrouter.test/api/v1', timeoutMs: 1000,
    },
  },
}));

import { requestChatCompletion } from '../src/integrations/openRouter/openRouterClient.js';

afterEach(() => vi.unstubAllGlobals());

describe('OpenRouter response handling', () => {
  it('classifies a length finish reason as a truncated response before parsing content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: 'free/provider-model', provider: 'test-provider',
      choices: [{ finish_reason: 'length', message: { content: '{questions:[' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const promise = requestChatCompletion([{ role: 'user', content: 'test' }], {
      maxTokens: 4000, diagnostics: { section: 'Git', batchNumber: 2, attempt: 1 },
    });
    await expect(promise).rejects.toMatchObject({
      code: 'AI_RESPONSE_TRUNCATED',
      providerMetadata: {
        actualModel: 'free/provider-model', provider: 'test-provider', finishReason: 'length',
        responseLength: 12, section: 'Git', batchNumber: 2, attempt: 1,
      },
    });
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.max_tokens).toBe(4000);
    expect(requestBody.response_format).toEqual({ type: 'json_object' });
  });
});
