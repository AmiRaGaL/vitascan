import { Module } from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { RecipesController } from './recipes.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [RecipesController],
  providers: [OptionalAuthGuard],
})
export class RecipesModule {}
