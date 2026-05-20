import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [ProfileController],
  providers: [OptionalAuthGuard],
})
export class ProfileModule {}
