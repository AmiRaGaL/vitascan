import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { EmbeddingsService } from './embeddings.service';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [SupabaseModule],
  providers: [EmbeddingsService, KnowledgeBaseService],
  exports: [EmbeddingsService, KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
