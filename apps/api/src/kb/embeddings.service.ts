import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

@Injectable()
export class EmbeddingsService {
  private readonly apiUrl =
    process.env.EMBEDDING_API_URL ?? 'https://api.openai.com/v1/embeddings';
  private readonly apiKey =
    process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
  private readonly model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

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
        'Embedding API key is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | EmbeddingResponse
      | null;

    if (!response.ok) {
      throw new HttpException(
        payload?.error?.message ?? 'Failed to generate embedding',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const embedding = payload?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new HttpException(
        'Embedding provider returned an invalid vector',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return embedding;
  }
}
