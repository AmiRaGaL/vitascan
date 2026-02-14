import { Module } from '@nestjs/common';
import { SymptomController } from './symptom.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [SymptomController],
})
export class SymptomModule {}
