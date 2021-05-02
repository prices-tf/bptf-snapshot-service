import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { ListingController } from './listing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snapshot } from '../listing/models/snapshot.entity';
import { Listing } from '../listing/models/listing.entity';
import { BullModule } from '@nestjs/bull';
import { RabbitMQWrapperModule } from '../rabbitmq-wrapper/rabbitmq-wrapper.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Snapshot, Listing]),
    BullModule.registerQueue({
      name: 'snapshot',
    }),
    RabbitMQWrapperModule,
  ],
  providers: [ListingService],
  controllers: [ListingController],
})
export class ListingModule {}
