// apps/api/src/symptom/symptom.module.ts
import { Module } from '@nestjs/common';
import { SymptomController } from './symptom.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';

@Module({
  controllers: [SymptomController],
  providers: [SupabaseService, GroqService],
})
export class SymptomModule {}
