import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsageController } from './usage.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [UsageController],
  providers: [OptionalAuthGuard],
})
export class UsageModule {}
