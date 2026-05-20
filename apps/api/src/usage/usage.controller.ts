import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('usage')
@UseGuards(OptionalAuthGuard)
export class UsageController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('today')
  async getTodayUsage(@Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const today = new Date().toISOString().slice(0, 10);
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
    };
  }
}
