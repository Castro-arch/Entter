import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';

export const CERTIFICATES_QUEUE = 'certificates';

@Global()
@Module({
  providers: [
    {
      provide: CERTIFICATES_QUEUE,
      useFactory: (redis: RedisService) => new Queue(CERTIFICATES_QUEUE, { connection: redis }),
      inject: [RedisService],
    },
  ],
  exports: [CERTIFICATES_QUEUE],
})
export class QueueModule {}
