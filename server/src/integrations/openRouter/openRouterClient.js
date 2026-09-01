import { env } from '../../config/environment.js';
import { AppError } from '../../utils/AppError.js';

export async function requestChatCompletion(messages, { maxTokens = 4_000 } = {}) {
  if (!env.openRouter.apiKey || !env.openRouter.model) {
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
        model: env.openRouter.model, messages, temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AppError('AI analysis is temporarily unavailable.', 502, 'AI_PROVIDER_ERROR');
    const payload = await response.json();
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new AppError('AI analysis response was truncated.', 502, 'AI_RESPONSE_TRUNCATED');
    }
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AppError('AI analysis returned an empty response.', 502, 'AI_INVALID_RESPONSE');
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
