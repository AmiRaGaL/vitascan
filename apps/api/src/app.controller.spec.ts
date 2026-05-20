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

  it('returns healthy status when Supabase responds', async () => {
    const controller = await createController();

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'OK',
      supabase: { connected: true },
      app: { name: expect.any(String), version: expect.any(String) },
    });
  });

  it('returns degraded status when Supabase check fails', async () => {
    const controller = await createController(new Error('db unavailable'));

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      supabase: { connected: false },
    });
  });
});
