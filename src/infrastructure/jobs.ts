import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { logger } from '../shared/logger';

export type JobHandler = (payload: any) => Promise<void>;

/**
 * Background job abstraction. Without Redis, jobs run in-process right after the current
 * request (best effort). With REDIS_ENABLED=true they are durable BullMQ jobs with retries.
 */
export interface JobQueue {
  register(name: string, handler: JobHandler): void;
  enqueue(name: string, payload: unknown): Promise<void>;
  close(): Promise<void>;
  /** Wait for in-process jobs to finish (tests). */
  drain(): Promise<void>;
}

export class InlineJobQueue implements JobQueue {
  private handlers = new Map<string, JobHandler>();
  private inflight = new Set<Promise<void>>();

  register(name: string, handler: JobHandler) {
    this.handlers.set(name, handler);
  }

  async enqueue(name: string, payload: unknown) {
    const handler = this.handlers.get(name);
    if (!handler) {
      logger.warn({ job: name }, 'no handler registered for job');
      return;
    }
    const p = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => handler(payload))
      .catch((err) => logger.error({ err, job: name }, 'inline job failed'))
      .finally(() => this.inflight.delete(p));
    this.inflight.add(p);
  }

  async drain() {
    while (this.inflight.size) await Promise.all([...this.inflight]);
  }

  async close() {
    await this.drain();
  }
}

export class BullJobQueue implements JobQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private handlers = new Map<string, JobHandler>();

  constructor(connection: Redis, runWorker = true) {
    this.queue = new Queue('vyora', { connection });
    if (runWorker) {
      this.worker = new Worker(
        'vyora',
        async (job) => {
          const handler = this.handlers.get(job.name);
          if (handler) await handler(job.data);
        },
        { connection: connection.duplicate({ maxRetriesPerRequest: null }), concurrency: 5 },
      );
      this.worker.on('failed', (job, err) => logger.error({ err, job: job?.name }, 'job failed'));
    }
  }

  register(name: string, handler: JobHandler) {
    this.handlers.set(name, handler);
  }

  async enqueue(name: string, payload: unknown) {
    await this.queue.add(name, payload, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000 });
  }

  async drain() {}

  async close() {
    await this.worker?.close();
    await this.queue.close();
  }
}
