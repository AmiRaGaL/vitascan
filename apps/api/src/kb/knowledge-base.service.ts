import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmbeddingsService } from './embeddings.service';

export interface KnowledgeBaseChunk {
  chunk_text: string;
  title: string;
  source: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async retrieveRelevantChunks(
    query: string,
    limit = 5,
  ): Promise<KnowledgeBaseChunk[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    try {
      const embedding = await this.embeddings.embedText(trimmedQuery);
      const { data, error } = await this.supabase.supabase.rpc(
        'match_kb_chunks',
        {
          query_embedding: embedding,
          match_count: limit,
        },
      );

      if (error) {
        this.logger.warn(`KB retrieval failed: ${error.message}`);
        return [];
      }

      return (data ?? []) as KnowledgeBaseChunk[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`KB retrieval skipped: ${message}`);
      return [];
    }
  }
}
