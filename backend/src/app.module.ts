import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CheckoutModule } from './checkout/checkout.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { UploadsModule } from './uploads/uploads.module';

// NOTE: DashboardModule is deliberately NOT imported here — the organizer
// dashboard overview still renders from hardcoded mock data on the frontend
// (see frontend/src/app/dashboard/page.tsx), so its backend endpoints stay
// unwired until that's explicitly switched over.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    EventsModule,
    PublicModule,
    CheckoutModule,
    AttendanceModule,
    QueueModule,
    CertificatesModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
