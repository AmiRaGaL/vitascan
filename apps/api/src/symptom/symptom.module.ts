// apps/api/src/symptom/symptom.module.ts
import { Module } from '@nestjs/common';
import { SymptomController } from './symptom.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import { RedFlagsService } from './red-flags.service';

@Module({
  controllers: [SymptomController],
  providers: [SupabaseService, GroqService, RedFlagsService],
  exports: [GroqService]
})
export class SymptomModule {}
