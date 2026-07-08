import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around a single `ioredis` connection, reused for the check-in
 * dedup lock, the attendance counters cache, and as the connection BullMQ's
 * `Queue`/`Worker` use for the certificates queue. `maxRetriesPerRequest:
 * null` is BullMQ's hard requirement for any connection passed to a
 * `Worker` (it issues blocking commands that are incompatible with
 * ioredis's default finite-retry behavior) — see
 * https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest.
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
