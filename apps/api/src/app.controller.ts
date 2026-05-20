import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('health')
  async getHealth() {
    const { error } = await this.supabase.supabase
      .from('users')
      .select('id')
      .limit(1);

    return {
      status: error ? 'degraded' : this.appService.getHello(),
      timestamp: new Date().toISOString(),
      supabase: {
        connected: !error,
      },
      app: {
        name: process.env.npm_package_name ?? '@vitascan/api',
        version: process.env.npm_package_version ?? '0.0.1',
      },
    };
  }
}
