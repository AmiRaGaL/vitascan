import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { AiMetricsService } from './ai-metrics.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiMetrics: AiMetricsService) {}

  @Get('metrics')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get aggregated AI safety and evaluation metrics' })
  async getMetrics(@Req() req: any) {
    if (!req.user?.id) {
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.aiMetrics.getMetrics();
  }
}
