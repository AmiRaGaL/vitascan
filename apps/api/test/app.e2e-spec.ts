import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { SupabaseService } from './../src/supabase/supabase.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        supabase: {
          from: jest.fn(),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpAdapter().getInstance())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          supabase: { configured: expect.any(Boolean) },
          ai: { configured: expect.any(Boolean) },
          app: { name: expect.any(String), version: expect.any(String) },
        });
        expect(JSON.stringify(body)).not.toContain(
          process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'unused-test-secret',
        );
        expect(JSON.stringify(body)).not.toContain(
          process.env.GROQ_API_KEY ?? 'unused-test-secret',
        );
      });
  });
});
