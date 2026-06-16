import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  embedding?: { values?: number[] };
  embeddings?: Array<{ values?: number[] }>;
  error?: { message?: string };
}

type EmbeddingProvider = 'gemini' | 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly provider = getEmbeddingProvider();
  private readonly model =
    process.env.EMBEDDING_MODEL ??
    (this.provider === 'gemini'
      ? 'gemini-embedding-2'
      : 'text-embedding-3-small');
  private readonly dimensions = getEmbeddingDimensions();
  private readonly apiUrl =
    process.env.EMBEDDING_API_URL ??
    getDefaultEmbeddingApiUrl(this.provider, this.model);
  private readonly apiKey =
    this.provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : (process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY);

  async embedText(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) {
      throw new HttpException(
        'Cannot embed empty text',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.apiKey) {
      throw new HttpException(
        this.provider === 'gemini'
          ? 'GEMINI_API_KEY is required when EMBEDDING_PROVIDER is gemini'
          : 'EMBEDDING_API_KEY or OPENAI_API_KEY is required when EMBEDDING_PROVIDER is openai',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.getRequestBody(input)),
    });

    const payload = (await response
      .json()
      .catch(() => null)) as EmbeddingResponse | null;

    if (!response.ok) {
      throw new HttpException(
        payload?.error?.message ?? 'Failed to generate embedding',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const embedding = this.extractEmbedding(payload);
    if (!Array.isArray(embedding) || embedding.length !== this.dimensions) {
      throw new HttpException(
        'Embedding provider returned an invalid vector',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return embedding;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.provider === 'gemini') {
      headers['x-goog-api-key'] = this.apiKey!;
    } else {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private getRequestBody(input: string) {
    if (this.provider === 'gemini') {
      return {
        model: `models/${this.model}`,
        content: {
          parts: [{ text: input }],
        },
        embedContentConfig: {
          outputDimensionality: this.dimensions,
        },
      };
    }

    return {
      model: this.model,
      input,
      dimensions: this.dimensions,
    };
  }

  private extractEmbedding(payload: EmbeddingResponse | null) {
    if (this.provider === 'gemini') {
      return payload?.embeddings?.[0]?.values ?? payload?.embedding?.values;
    }

    return payload?.data?.[0]?.embedding;
  }
}

function getEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER ?? 'gemini').toLowerCase();
  return provider === 'openai' ? 'openai' : 'gemini';
}

function getEmbeddingDimensions() {
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? '1536');
  return Number.isInteger(dimensions) && dimensions > 0 ? dimensions : 1536;
}

function getDefaultEmbeddingApiUrl(provider: EmbeddingProvider, model: string) {
  if (provider === 'gemini') {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
  }

  return 'https://api.openai.com/v1/embeddings';
}
