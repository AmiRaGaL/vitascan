import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { SymptomModule } from './symptom/symptom.module';

@Module({
  imports: [
    SupabaseModule,
    SymptomModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
