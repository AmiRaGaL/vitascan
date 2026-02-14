// apps/api/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { TriageResult } from '@vitascan/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): { status: string; testTriage: TriageResult } {
    const triage: TriageResult = {
      triageLevel: 'home',
      specialtySuggestion: null,
      possibleIssueCategories: ['general'],
      redFlags: [],
      confidence: 95,
      homeCareAdvice: 'Stay hydrated and rest.',
      doctorVisitPreparationTips: 'If symptoms persist for more than 3 days, contact your PCP.'
    };

    return {
      status: this.appService.getHello(),
      testTriage: triage
    };
  }
}
