import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiController } from './ai.controller';
import { AiMetricsService } from './ai-metrics.service';

@Module({
  imports: [HttpModule, SupabaseModule],
  controllers: [AiController],
  providers: [AiMetricsService, OptionalAuthGuard],
})
export class AiModule {}
