import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { BullHealthIndicator } from './bull.health';
import { TerminusModule } from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from './rabbitmq.health';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({
      name: 'snapshot',
    }),
    RabbitMQWrapperModule,
  ],
  providers: [BullHealthIndicator, RabbitMQHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
