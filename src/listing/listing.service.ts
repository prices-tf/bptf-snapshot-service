import { Injectable } from '@nestjs/common';
import { Snapshot } from './models/snapshot.entity';
import { getConnection, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { Listing } from './models/listing.entity';
import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue } from 'bull';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
    @InjectQueue('snapshot')
    private snapshotQueue: Queue<{
      sku: string;
    }>,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async enqueueSnapshot(sku: string, delay?: number): Promise<void> {
    const jobId = sku;

    const oldJob = await this.snapshotQueue.getJob(jobId);

    if (oldJob?.finishedOn !== undefined) {
      try {
        await oldJob.remove();
      } catch (error) {
        // This might error for some reason, so catching it here
      }
    }

    const options: Bull.JobOptions = {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: 10,
    };

    if (delay !== undefined) {
      options.delay = delay;
    }

    console.log(options);

    await this.snapshotQueue.add(
      {
        sku,
      },
      options,
    );
  }

  getListingsBySKU(sku: string): Promise<Snapshot> {
    return this.snapshotRepository.findOne({
      where: {
        sku: sku,
      },
      relations: ['listings'],
    });
  }

  getSnapshots(options: IPaginationOptions): Promise<Pagination<Snapshot>> {
    return paginate<Snapshot>(this.snapshotRepository, options);
  }

  async saveSnapshot(createSnapshot: CreateSnapshotDto): Promise<Snapshot> {
    // const snapshot = this.snapshotRepository.create(createSnapshot);

    const snapshot = await getConnection().transaction(
      async (transactionalEntityManager) => {
        const currentSnapshots = await transactionalEntityManager.find(
          Snapshot,
          {
            where: {
              sku: createSnapshot.sku,
            },
          },
        );

        if (currentSnapshots.length !== 0) {
          // Remove old listings
          await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Listing)
            .where({
              snapshot: In(currentSnapshots.map((snapshot) => snapshot.id)),
            })
            .execute();

          // Remove old snapshots
          await transactionalEntityManager.remove(currentSnapshots);
        }

        const snapshot = await transactionalEntityManager.save(
          transactionalEntityManager.create(Snapshot, {
            sku: createSnapshot.sku,
            createdAt: createSnapshot.createdAt,
          }),
        );

        const listings = await transactionalEntityManager.save(
          transactionalEntityManager.create(
            Listing,
            createSnapshot.listings.map((listing) => ({
              id: listing.id,
              steamid64: listing.steamid64,
              item: listing.item,
              intent: listing.intent,
              currenciesKeys: listing.currencies.keys,
              currenciesHalfScrap: Math.round(listing.currencies.metal * 9 * 2),
              isAutomatic: listing.isAutomatic,
              isOffers: listing.isOffers,
              createdAt: listing.createdAt,
              bumpedAt: listing.bumpedAt,
              snapshot,
            })),
          ),
        );

        snapshot.listings = listings;

        return snapshot;
      },
    );

    await this.amqpConnection.publish('snapshot.created', '*', snapshot);

    return snapshot;
  }
}
