import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { SymptomModule } from './symptom/symptom.module';
import { ProfileModule } from './profile/profile.module';
import { UsageModule } from './usage/usage.module';
import { RecipesModule } from './recipes/recipes.module';
import { ChatModule } from './chat/chat.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    SupabaseModule,
    SymptomModule,
    ProfileModule,
    UsageModule,
    RecipesModule,
    ChatModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
