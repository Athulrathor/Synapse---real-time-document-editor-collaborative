import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
// @ts-expect-error cookie-parser does not ship TypeScript declarations.
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // instrument: ObserveInstrument,
  });

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);

  app.useGlobalFilters(new GlobalExceptionFilter());
  
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: configService.get<string>(
      'app.corsOrigin',
      'http://localhost:3000',
    ),
    credentials: true,
  });

  const port = configService.get('app.port', 4000) as number;

  await app.listen(process.env.PORT ?? 4000,'0.0.0.0');
}
await bootstrap();
