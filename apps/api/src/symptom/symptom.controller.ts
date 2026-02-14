import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { 
  SymptomSessionStartRequest, 
  SymptomSessionStartResponse 
} from '@vitascan/shared';

@Controller('symptom-sessions')
export class SymptomController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post()
  async startSession(@Body() body: SymptomSessionStartRequest): Promise<SymptomSessionStartResponse> {
    console.log('📥 Symptom input:', body.initialInput);
    
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .insert({ 
        initial_input: body.initialInput,
        status: 'completed' 
      })
      .select('id')
      .single();

    console.log('📤 Supabase response:', { data, error });

    if (error) {
      console.error('❌ Supabase ERROR:', error);
      throw new HttpException(
        `Database Error: ${error.message} (code: ${error.code})`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    console.log('✅ Session created:', data.id);

    return {
      sessionId: data.id,
      triagePreview: {
        triageLevel: 'home',
        specialtySuggestion: 'Primary Care',
        possibleIssueCategories: ['general'],
        redFlags: [],
        confidence: 85,
        homeCareAdvice: 'Rest and hydrate.',
        doctorVisitPreparationTips: 'Monitor symptoms.'
      }
    };
  }
}
