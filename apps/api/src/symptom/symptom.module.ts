// apps/api/src/symptom/symptom.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SymptomController } from './symptom.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import { RedFlagsService } from './red-flags.service';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { KnowledgeBaseModule } from '../kb/knowledge-base.module';
import { AiServiceClient } from './ai-service.client';

@Module({
  imports: [HttpModule, KnowledgeBaseModule],
  controllers: [SymptomController],
  providers: [
    SupabaseService,
    GroqService,
    AiServiceClient,
    RedFlagsService,
    OptionalAuthGuard,
  ],
  exports: [GroqService],
})
export class SymptomModule {}
