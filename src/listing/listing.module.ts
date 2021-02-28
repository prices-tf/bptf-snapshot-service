import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snapshot } from '../listing/models/snapshot.entity';
import { Listing } from '../listing/models/listing.entity';
import { BullModule } from '@nestjs/bull';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config, RabbitMQConfig } from '../common/config/configuration';

@Module({
  imports: [
    TypeOrmModule.forFeature([Snapshot, Listing]),
    BullModule.registerQueue({
      name: 'snapshot',
    }),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Config>) => {
        const rabbitmqConfig = configService.get<RabbitMQConfig>('rabbitmq');

        return {
          exchanges: [
            {
              name: 'snapshot.created',
              type: 'fanout',
            },
          ],
          uri: `amqp://${rabbitmqConfig.username}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}`,
        };
      },
    }),
  ],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
