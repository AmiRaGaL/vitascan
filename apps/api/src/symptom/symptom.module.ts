// apps/api/src/symptom/symptom.module.ts
import { Module } from '@nestjs/common';
import { SymptomController } from './symptom.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import { RedFlagsService } from './red-flags.service';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { KnowledgeBaseModule } from '../kb/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  controllers: [SymptomController],
  providers: [SupabaseService, GroqService, RedFlagsService, OptionalAuthGuard],
  exports: [GroqService],
})
export class SymptomModule {}
