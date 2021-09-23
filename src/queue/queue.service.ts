import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import Bull, { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('snapshot')
    private readonly queue: Queue,
  ) {}

  getJobCounts(): Promise<Bull.JobCounts> {
    return this.queue.getJobCounts();
  }

  pause(): Promise<void> {
    return this.queue.pause(false, true);
  }

  resume(): Promise<void> {
    return this.queue.resume(false);
  }

  isPaused(): Promise<boolean> {
    return this.queue.isPaused(false);
  }
}
