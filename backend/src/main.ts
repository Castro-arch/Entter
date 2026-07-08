import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { UPLOADS_ROOT } from './uploads/uploads.constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useWebSocketAdapter(new IoAdapter(app));

  // The organizer dashboard runs on a separate origin and authenticates via the
  // httpOnly `access_token` cookie, so credentialed CORS must be enabled with an
  // explicit origin (the spec forbids `*` when credentials are included). Must
  // be registered before `useStaticAssets` below — Express ends the response
  // inside the static middleware for any matching file, so a CORS middleware
  // registered afterwards would never run for those requests (e.g. the
  // credential editor's canvas preview loads artwork with `crossOrigin:
  // "anonymous"`, which requires the header on the file response itself).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  // Uploaded credential artwork / certificate templates are plain public
  // files — same trust model as the URLs organizers used to paste — so
  // they're served directly rather than proxied through a route handler.
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
