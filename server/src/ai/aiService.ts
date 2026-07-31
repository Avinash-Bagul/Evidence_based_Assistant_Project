import Groq from 'groq-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * AI Service — Single LLM interface using Groq.
 * 
 * All AI operations (planning, classification, brief generation)
 * go through this service with specialized prompts.
 */

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables.');
    }
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

function parseRetryDelay(error: unknown): number | null {
  try {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : '';
    const match = msg.match(/try again in ([\d\.]+)s/i);
    if (match && match[1]) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 500;
    }
  } catch {
    // Ignore parsing failures
  }
  return null;
}

/**
 * Send a chat completion request to Groq with automatic retry handling for rate limits (429).
 */
export async function getCompletion(options: AICompletionOptions): Promise<string> {
  const client = getGroqClient();
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const response = await client.chat.completions.create({
        model: config.groqModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.responseFormat,
      });

      const duration = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';

      logger.info(
        {
          model: config.groqModel,
          duration,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
        },
        'AI completion finished'
      );

      return content;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errObj = error as { status?: number; error?: { error?: { code?: string } }; message?: string };
      const isRateLimit =
        errObj?.status === 429 ||
        errObj?.error?.error?.code === 'rate_limit_exceeded' ||
        (errObj?.message && String(errObj.message).includes('rate_limit_exceeded'));

      if (isRateLimit && attempt < maxRetries) {
        const parsedDelay = parseRetryDelay(error);
        const backoffDelay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
        const waitMs = parsedDelay ? Math.max(parsedDelay, 2500) : backoffDelay;

        logger.warn(
          { attempt, maxRetries, waitMs, errorMsg: errObj?.message || 'Rate limit 429' },
          `Groq API rate limit hit (429). Waiting ${waitMs}ms before retry ${attempt}/${maxRetries}...`
        );

        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      logger.error({ error, duration }, 'AI completion failed');
      throw error;
    }
  }

  throw new Error('AI completion failed after maximum retries');
}

/**
 * Generate an embedding vector for a text string.
 * Returns null if embedding model/API is unavailable.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    if (config.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: config.embeddingModel || 'text-embedding-3-small',
          input: text.substring(0, 8192),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { data: { embedding: number[] }[] };
        return data.data[0]?.embedding || null;
      }
    }
  } catch (err) {
    logger.warn({ error: err }, 'Embedding generation failed');
  }

  return null;
}
export function parseJsonResponse<T>(response: string): T {
  try {
    return JSON.parse(response);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
