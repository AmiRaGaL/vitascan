import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsageTodayDto } from '../docs/swagger.dto';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

const SYMPTOM_LIMITS = {
  free: 5,
  premium: 50,
} as const;

const CHAT_LIMITS = {
  free: 10,
  premium: 50,
} as const;

@ApiTags('usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(OptionalAuthGuard)
export class UsageController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('today')
  @ApiOperation({ summary: 'Get today usage counts and limits' })
  @ApiOkResponse({ type: UsageTodayDto })
  async getTodayUsage(@Req() req: any) {
    if (!req.user?.id)
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );

    const today = new Date().toISOString().slice(0, 10);
    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('tier')
      .eq('id', req.user.id)
      .maybeSingle<{ tier: 'free' | 'premium' | null }>();

    if (userError)
      throw new HttpException(
        userError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const tier = user?.tier === 'premium' ? 'premium' : 'free';
    const { data, error } = await this.supabase.supabase
      .from('usage_counters')
      .select('symptom_checks_used, chats_used')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .maybeSingle();

    if (error)
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    return {
      symptom_checks_used: data?.symptom_checks_used ?? 0,
      chats_used: data?.chats_used ?? 0,
      symptom_checks_limit: SYMPTOM_LIMITS[tier],
      chats_limit: CHAT_LIMITS[tier],
    };
  }
}
