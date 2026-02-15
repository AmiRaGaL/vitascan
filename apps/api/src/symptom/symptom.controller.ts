import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GroqService } from './groq.service';
import type { 
  BodyArea,
  SymptomCategory,
  SymptomQuestion,
  StructuredSymptomRequest,
  TriageResult
} from '@vitascan/shared';

@Controller('symptom-sessions')
export class SymptomController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly groq: GroqService  
  ) {}

  // NEW: Get all body areas
  @Get('body-areas')
  async getBodyAreas(): Promise<BodyArea[]> {
    const { data, error } = await this.supabase.supabase
      .from('body_areas')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  // NEW: Get symptoms for a body area
  @Get('symptom-categories/:bodyAreaId')
  async getSymptomCategories(@Param('bodyAreaId') bodyAreaId: string): Promise<SymptomCategory[]> {
    const { data, error } = await this.supabase.supabase
      .from('symptom_categories')
      .select('*')
      .eq('body_area_id', bodyAreaId)
      .order('sort_order', { ascending: true });

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  // NEW: Get questions for a symptom
  @Get('symptom-questions/:categoryId')
  async getQuestions(@Param('categoryId') categoryId: string): Promise<SymptomQuestion[]> {
    const { data, error } = await this.supabase.supabase
      .from('symptom_questions')
      .select('*')
      .eq('symptom_category_id', categoryId)
      .order('sort_order', { ascending: true });

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    return data;
  }

  // NEW: Analyze structured symptoms
  @Post('analyze')
  async analyzeSymptoms(@Body() body: StructuredSymptomRequest) {
    console.log('📥 Structured symptom data:', body);
    
    // Generate AI triage with structured data
    const triageResult = await this.groq.analyzeStructuredSymptoms(body);
    
    // Save to database
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .insert({ 
        body_area_id: body.body_area_id,
        symptom_category_id: body.symptom_category_id,
        user_answers: body.answers,
        health_profile_snapshot: body.health_profile,
        status: 'completed',
        triage_level: triageResult.triageLevel,
        specialty_suggestion: triageResult.specialtySuggestion,
        llm_confidence: triageResult.confidence,
        red_flags_detected: triageResult.redFlags.length > 0,
        initial_input: `${body.body_area_name}: ${body.symptom_name}`,
        summary: triageResult.homeCareAdvice
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Supabase ERROR:', error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    console.log('✅ Session created:', data.id);

    return {
      sessionId: data.id,
      triage: triageResult
    };
  }

  // KEEP: Old endpoint for backwards compatibility
  @Post()
  async startSession(@Body() body: { initialInput: string }) {
    console.log('📥 Symptom input:', body.initialInput);
    
    const triagePreview = await this.groq.getSymptomTriage(body.initialInput);
    
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .insert({ 
        initial_input: body.initialInput,
        status: 'completed' 
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Supabase ERROR:', error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    console.log('✅ Session created:', data.id);

    return {
      sessionId: data.id,
      triagePreview
    };
  }
}
