import { env } from '../../config/environment.js';
import { AppError } from '../../utils/AppError.js';

function providerMetadata(payload, content, requestedModel, diagnostics = {}) {
  const choice = payload?.choices?.[0];
  return {
    requestedModel,
    actualModel: payload?.model,
    provider: payload?.provider || choice?.provider,
    finishReason: choice?.finish_reason,
    responseLength: typeof content === 'string' ? content.length : 0,
    ...diagnostics,
  };
}

function attachMetadata(error, metadata) {
  error.providerMetadata = metadata;
  return error;
}

export async function requestChatCompletion(messages, {
  maxTokens = 4_000, diagnostics = {}, onMetadata, model = env.openRouter.model,
} = {}) {
  if (!env.openRouter.apiKey || !model) {
    throw new AppError('AI analysis is not configured.', 503, 'AI_NOT_CONFIGURED');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.openRouter.timeoutMs);
  try {
    const response = await fetch(`${env.openRouter.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.clientUrl,
        'X-Title': 'AI Interview Assessment Platform',
      },
      body: JSON.stringify({
        model, messages, temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    const content = payload?.choices?.[0]?.message?.content;
    const metadata = providerMetadata(payload, content, model, diagnostics);
    onMetadata?.(metadata);
    if (!response.ok) {
      console.warn({ code: 'AI_PROVIDER_ERROR', status: response.status, ...metadata });
      throw attachMetadata(new AppError('AI analysis is temporarily unavailable.', 502, 'AI_PROVIDER_ERROR'), metadata);
    }
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason === 'length') {
      console.warn({ code: 'AI_RESPONSE_TRUNCATED', ...metadata });
      throw attachMetadata(new AppError('AI analysis response was truncated.', 502, 'AI_RESPONSE_TRUNCATED'), metadata);
    }
    if (typeof content !== 'string' || !content.trim()) {
      throw attachMetadata(new AppError('AI analysis returned an empty response.', 502, 'AI_INVALID_RESPONSE'), metadata);
    }
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') throw new AppError('AI analysis timed out.', 504, 'AI_TIMEOUT');
    throw new AppError('AI analysis is temporarily unavailable.', 502, 'AI_PROVIDER_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
