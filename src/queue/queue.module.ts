import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'snapshot',
    }),
  ],
  providers: [QueueService],
  controllers: [QueueController],
})
export class QueueModule {}
