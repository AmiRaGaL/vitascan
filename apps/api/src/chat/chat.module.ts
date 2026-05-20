import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { SymptomModule } from '../symptom/symptom.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [SupabaseModule, SymptomModule],
  controllers: [ChatController],
  providers: [OptionalAuthGuard],
})
export class ChatModule {}
