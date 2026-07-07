import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around a single `ioredis` connection, reused for both the
 * check-in dedup lock and the attendance counters cache.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<string>('REDIS_URL'));
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
