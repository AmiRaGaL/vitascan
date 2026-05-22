import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NextFunction, Request, Response } from 'express';
import { ApiExceptionFilter } from './security/api-exception.filter';

dotenv.config();

const REQUIRED_PRODUCTION_WEB_ORIGIN = 'https://vitascan-web-rho.vercel.app';

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ApiExceptionFilter());
  app.use(applySecurityHeaders);
  app.use(logRequestSummary);
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      logRejectedCorsOrigin(normalizedOrigin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'VitaScan API started',
      port,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      corsOriginsConfigured: allowedOrigins.length,
    }),
  );
}

function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'GROQ_API_KEY',
    'EMBEDDING_MODEL',
    'WEB_ORIGIN',
    'PORT',
    'NODE_ENV',
  ];
  const missingEnvVars = requiredEnvVars.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingEnvVars.join(', ')}`,
    );
  }

  const configuredOrigins = parseConfiguredWebOrigins();
  if (!configuredOrigins.includes(REQUIRED_PRODUCTION_WEB_ORIGIN)) {
    throw new Error(
      `WEB_ORIGIN must include ${REQUIRED_PRODUCTION_WEB_ORIGIN}`,
    );
  }
}

function getAllowedOrigins() {
  const configuredOrigins = parseConfiguredWebOrigins();

  if (process.env.NODE_ENV === 'production') return configuredOrigins;

  return [...configuredOrigins, ...getLocalhostOrigins()];
}

function parseConfiguredWebOrigins() {
  return (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

function normalizeOrigin(origin: string | undefined) {
  return origin?.trim().replace(/\/+$/, '');
}

function logRejectedCorsOrigin(origin: string) {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Rejected CORS origin',
      origin,
    }),
  );
}

function getLocalhostOrigins() {
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
}

function applySecurityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
  next();
}

function logRequestSummary(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const userId = (req as any).user?.id ?? null;
    const route = sanitizeRoute(req.route?.path ?? req.path);
    const responseTimeMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        route,
        statusCode: res.statusCode,
        responseTimeMs,
        userId,
      }),
    );
  });

  next();
}

function sanitizeRoute(route: string) {
  return route.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );
}

bootstrap().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'VitaScan API failed to start',
      error: error instanceof Error ? error.message : 'Unknown startup error',
      stack:
        process.env.NODE_ENV === 'production' || !(error instanceof Error)
          ? undefined
          : error.stack,
    }),
  );
  process.exit(1);
});
