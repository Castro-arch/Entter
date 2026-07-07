import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around a single `ioredis` connection, reused for the check-in
 * dedup lock, the attendance counters cache, and BullMQ (which requires
 * `maxRetriesPerRequest: null` on any connection it's handed).
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
