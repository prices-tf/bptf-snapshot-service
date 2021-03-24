import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { BullHealthIndicator } from './bull.health';
import { TerminusModule } from '@nestjs/terminus';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config, RabbitMQConfig } from '../common/config/configuration';
import { RabbitMQHealthIndicator } from './rabbitmq.health';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({
      name: 'snapshot',
    }),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Config>) => {
        const rabbitmqConfig = configService.get<RabbitMQConfig>('rabbitmq');

        return {
          exchanges: [],
          uri: `amqp://${rabbitmqConfig.username}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}`,
        };
      },
    }),
  ],
  providers: [BullHealthIndicator, RabbitMQHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
