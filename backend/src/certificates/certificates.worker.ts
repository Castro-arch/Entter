import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { CERTIFICATES_QUEUE } from '../queue/queue.module';
import { CertificatesService } from './certificates.service';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const SWEEP_JOB_ID = 'certificates-sweep';

/** Consumes `send` (one participant) and `sweep` (AUTO-dispatch check) jobs
 * from the certificates queue. */
@Injectable()
export class CertificatesWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificatesWorker.name);
  private worker: Worker | undefined;

  constructor(
    @Inject(CERTIFICATES_QUEUE) private readonly queue: Queue,
    private readonly certificatesService: CertificatesService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    this.worker = new Worker(
      CERTIFICATES_QUEUE,
      async (job: Job) => {
        if (job.name === 'send') {
          await this.certificatesService.send(job.data.participantId as string);
        } else if (job.name === 'sweep') {
          await this.certificatesService.runAutoDispatchSweep();
        }
      },
      { connection: this.redis },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} (${job?.name}) failed: ${err.message}`);
    });

    // A stable jobId means restarts don't pile up duplicate repeatables.
    await this.queue.add(
      'sweep',
      {},
      { repeat: { every: SWEEP_INTERVAL_MS }, jobId: SWEEP_JOB_ID },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
