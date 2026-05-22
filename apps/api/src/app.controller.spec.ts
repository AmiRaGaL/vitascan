import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';

describe('AppController', () => {
  async function createController(error: Error | null = null) {
    const supabaseMock = {
      supabase: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ error }),
          }),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    return module.get<AppController>(AppController);
  }

  it('returns safe healthy status without probing Supabase', async () => {
    const controller = await createController();

    expect(controller.getHealth()).toMatchObject({
      status: 'ok',
      supabase: { configured: expect.any(Boolean) },
      app: { name: expect.any(String), version: expect.any(String) },
    });
  });

  it('returns degraded deep health status when Supabase check fails', async () => {
    const controller = await createController(new Error('db unavailable'));

    await expect(controller.getDeepHealth()).resolves.toMatchObject({
      status: 'degraded',
      checks: {
        supabase: { status: 'fail' },
      },
    });
  });
});
