import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { loadEnvironment } from './config/environment.js';

export function configureApplication(app: NestFastifyApplication): void {
  const env = loadEnvironment(process.env);
  app.enableCors({ origin: env.corsOrigins, credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const config = new DocumentBuilder().setTitle('Product Management API').setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}

export async function createApplication(): Promise<NestFastifyApplication> {
  loadEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { abortOnError: false });
  configureApplication(app);
  return app;
}
