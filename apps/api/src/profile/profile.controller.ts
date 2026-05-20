import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

interface HealthProfileBody {
  age?: number | null;
  sex_at_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  chronic_conditions?: string[];
  medications?: string[];
  allergies?: string[];
  diet_prefs?: string[];
}

@Controller('profile')
@UseGuards(OptionalAuthGuard)
export class ProfileController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async getProfile(@Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data, error } = await this.supabase.supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return data;
  }

  @Put()
  async updateProfile(@Body() body: HealthProfileBody, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const profile = {
      user_id: req.user.id,
      age: body.age ?? null,
      sex_at_birth: body.sex_at_birth ?? null,
      height_cm: body.height_cm ?? null,
      weight_kg: body.weight_kg ?? null,
      chronic_conditions: body.chronic_conditions ?? [],
      medications: body.medications ?? [],
      allergies: body.allergies ?? [],
      diet_prefs: body.diet_prefs ?? [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.supabase
      .from('health_profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return data;
  }
}
