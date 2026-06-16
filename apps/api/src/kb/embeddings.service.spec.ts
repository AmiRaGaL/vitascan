import { HttpException } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.EMBEDDING_DIMENSIONS;
    delete process.env.EMBEDDING_API_KEY;
    delete process.env.EMBEDDING_API_URL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('uses Gemini embeddings by default with a 1536-dimensional vector', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    const embedding = Array(1536).fill(0.02);
    mockFetchResponse({
      ok: true,
      payload: { embedding: { values: embedding } },
    });

    await expect(new EmbeddingsService().embedText(' fever ')).resolves.toBe(
      embedding,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': 'gemini-key',
        },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2',
          content: {
            parts: [{ text: 'fever' }],
          },
          embedContentConfig: {
            outputDimensionality: 1536,
          },
        }),
      },
    );
  });

  it('requires GEMINI_API_KEY when Gemini is configured', async () => {
    process.env.EMBEDDING_PROVIDER = 'gemini';

    await expect(new EmbeddingsService().embedText('fever')).rejects.toThrow(
      HttpException,
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects Gemini vectors that do not match EMBEDDING_DIMENSIONS', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    mockFetchResponse({
      ok: true,
      payload: { embedding: { values: Array(768).fill(0.02) } },
    });

    await expect(new EmbeddingsService().embedText('fever')).rejects.toThrow(
      'Embedding provider returned an invalid vector',
    );
  });

  it('uses OpenAI only when explicitly configured', async () => {
    process.env.EMBEDDING_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'openai-key';
    const embedding = Array(1536).fill(0.03);
    mockFetchResponse({
      ok: true,
      payload: { data: [{ embedding }] },
    });

    await expect(new EmbeddingsService().embedText('cough')).resolves.toBe(
      embedding,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer openai-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'cough',
          dimensions: 1536,
        }),
      }),
    );
  });

  function mockFetchResponse({
    ok,
    payload,
  }: {
    ok: boolean;
    payload: unknown;
  }) {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(payload),
    });
  }
});
