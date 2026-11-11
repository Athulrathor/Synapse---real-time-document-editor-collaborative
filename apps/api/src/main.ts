import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
// @ts-expect-error cookie-parser does not ship TypeScript declarations.
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { formatValidationErrors } from './common/filters/validation-error.formatter.js';
import { AppException } from './common/exceptions/app.exception.js';
import { ResponseInterceptor } from './common/interfaces/api-response.interface.js';
import { ValidationPipe } from '@nestjs/common';

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
      exceptionFactory: (error) =>
        new AppException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          status: 400,
          details: formatValidationErrors(error),
        }),
    }),
  );

  const configService = app.get(ConfigService);

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      configService.get<string>('app.frontendUrl'),
      'http://localhost:3000',
    ],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? configService.get('app.port', 4000));

  await app.listen(port, '0.0.0.0');
}
await bootstrap();
