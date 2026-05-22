import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
      supabase: {
        configured: Boolean(process.env.SUPABASE_URL),
      },
      ai: {
        configured: Boolean(process.env.GROQ_API_KEY),
      },
      app: {
        name: process.env.npm_package_name ?? '@vitascan/api',
        version: process.env.npm_package_version ?? '0.0.1',
      },
    };
  }

  @Get('health/deep')
  async getDeepHealth() {
    const supabaseStatus = await this.checkSupabase();
    const aiConfigured = Boolean(process.env.GROQ_API_KEY);
    const ok = supabaseStatus.ok && aiConfigured;

    return {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        supabase: {
          status: supabaseStatus.ok ? 'pass' : 'fail',
        },
        aiProviderConfig: {
          status: aiConfigured ? 'pass' : 'fail',
        },
      },
    };
  }

  private async checkSupabase() {
    try {
      const { error } = await this.supabase.supabase
        .from('users')
        .select('id')
        .limit(1);

      return {
        ok: !error,
      };
    } catch {
      return {
        ok: false,
      };
    }
  }
}
