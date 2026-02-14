import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import type { TriageResult } from '@vitascan/shared';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('health')
  async getHealth() {
    // Test Supabase connection
    const { data, error } = await this.supabase.supabase
      .from('users')
      .select('tier')
      .limit(1);

    const triage: TriageResult = {
      triageLevel: 'home',
      specialtySuggestion: null,
      possibleIssueCategories: ['general'],
      redFlags: [],
      confidence: 95,
      homeCareAdvice: 'Stay hydrated and rest.',
      doctorVisitPreparationTips: 'If symptoms persist >3 days, contact PCP.',
    };

    return {
      status: this.appService.getHello(),
      supabaseConnected: !error,
      dbSample: data,
      testTriage: triage,
    };
  }
}