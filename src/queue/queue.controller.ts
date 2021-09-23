import { Controller, Get, Post } from '@nestjs/common';
import Bull from 'bull';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  getJobCounts(): Promise<Bull.JobCounts> {
    return this.queueService.getJobCounts();
  }

  @Get('paused')
  async isPaused(): Promise<{ isPaused: boolean }> {
    const isPaused = await this.queueService.isPaused();
    return {
      isPaused,
    };
  }

  @Post('pause')
  pause(): Promise<void> {
    return this.queueService.pause();
  }

  @Post('resume')
  resume(): Promise<void> {
    return this.queueService.resume();
  }
}
