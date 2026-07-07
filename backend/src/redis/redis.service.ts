import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Thin wrapper around a single `ioredis` connection, reused by BullMQ. */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<string>('REDIS_URL'), {
      // BullMQ requires this on any connection it's handed.
      maxRetriesPerRequest: null,
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
