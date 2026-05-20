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

const VALID_SEX_AT_BIRTH = new Set(['male', 'female', 'other']);

interface ProfileStatus {
  exists: boolean;
  complete: boolean;
  missingFields: string[];
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

  @Get('status')
  async getProfileStatus(@Req() req: any): Promise<ProfileStatus> {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data, error } = await this.supabase.supabase
      .from('health_profiles')
      .select('age, sex_at_birth')
      .eq('user_id', req.user.id)
      .maybeSingle<Pick<HealthProfileBody, 'age' | 'sex_at_birth'>>();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return this.getCompletionStatus(data ?? null);
  }

  @Put()
  async updateProfile(@Body() body: HealthProfileBody, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const validationError = this.validateProfile(body);
    if (validationError)
      throw new HttpException(validationError, HttpStatus.BAD_REQUEST);

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

  private getCompletionStatus(
    profile: Pick<HealthProfileBody, 'age' | 'sex_at_birth'> | null,
  ): ProfileStatus {
    const missingFields: string[] = [];

    if (profile?.age === undefined || profile.age === null) {
      missingFields.push('age');
    }

    if (!profile?.sex_at_birth) {
      missingFields.push('sex_at_birth');
    }

    return {
      exists: !!profile,
      complete: missingFields.length === 0,
      missingFields,
    };
  }

  private validateProfile(body: HealthProfileBody): string | null {
    if (!body || typeof body !== 'object') return 'Profile body is required';

    const numberFields: Array<[keyof HealthProfileBody, number, number]> = [
      ['age', 0, 130],
      ['height_cm', 30, 275],
      ['weight_kg', 1, 700],
    ];

    for (const [field, min, max] of numberFields) {
      const value = body[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value))
        return `${field} must be a number`;
      if (value < min || value > max)
        return `${field} must be between ${min} and ${max}`;
    }

    if (
      body.sex_at_birth &&
      (typeof body.sex_at_birth !== 'string' ||
        !VALID_SEX_AT_BIRTH.has(body.sex_at_birth))
    ) {
      return 'sex_at_birth must be male, female, or other';
    }

    const arrayFields: Array<keyof HealthProfileBody> = [
      'chronic_conditions',
      'medications',
      'allergies',
      'diet_prefs',
    ];

    for (const field of arrayFields) {
      const value = body[field];
      if (value === undefined) continue;
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== 'string')
      ) {
        return `${field} must be an array of strings`;
      }
    }

    return null;
  }
}
