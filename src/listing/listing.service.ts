import { Injectable } from '@nestjs/common';
import { Snapshot } from './models/snapshot.entity';
import { getConnection, Repository } from 'typeorm';
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
import * as SKU from 'tf2-sku';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectQueue('snapshot')
    private readonly snapshotQueue: Queue<{
      sku: string;
    }>,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  isValidSKU(sku: string): boolean {
    const item = SKU.fromString(sku);

    if (item.craftnumber !== null) {
      return false;
    }

    return sku === SKU.fromObject(item);
  }

  async enqueueSnapshot(sku: string, delay?: number): Promise<boolean> {
    const jobId = sku;

    const job = await this.snapshotQueue.getJob(jobId);

    if (job) {
      const state = await job.getState();

      if (state === 'delayed') {
        // Job is delayed, figure out if it should be promoted, removed or ignored
        const now = new Date().getTime();
        const delayEnd = job.timestamp + job.opts.delay;

        if (delay == undefined) {
          if (delayEnd > now) {
            // Job is delayed, promote it to waiting
            await job.promote();
            return false;
          }
        } else if (delayEnd > now + delay) {
          // If job was made again with new delay then it would be processed earlier
          await job.remove();
        } else {
          // Job should not be updated
          return false;
        }
      } else if (state === 'completed' || state === 'failed') {
        // Job is finished, remove it
        await job.remove();
      } else {
        // Job already in the queue
        return false;
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
      removeOnFail: true,
    };

    if (delay !== undefined) {
      options.delay = delay;
    }

    await this.snapshotQueue.add(
      {
        sku,
      },
      options,
    );

    // Added job to queue

    return true;
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
    await getConnection().transaction(async (transactionalEntityManager) => {
      const currentSnapshots = await transactionalEntityManager.find(Snapshot, {
        where: {
          sku: createSnapshot.sku,
        },
        lock: {
          mode: 'pessimistic_read',
        },
      });

      if (currentSnapshots.length !== 0) {
        // Remove old snapshots
        await transactionalEntityManager.remove(currentSnapshots);
      }
    });

    const listings = createSnapshot.listings.map((listing) => {
      return this.listingRepository.create({
        steamid64: listing.steamid64,
        item: listing.item,
        intent: listing.intent,
        currenciesKeys: listing.currencies.keys,
        currenciesHalfScrap: Math.round(listing.currencies.metal * 9 * 2),
        isAutomatic: listing.isAutomatic,
        isOffers: listing.isOffers,
        isBuyout: listing.isBuyout,
        details: listing.details,
        createdAt: listing.createdAt,
        bumpedAt: listing.bumpedAt,
      });
    });

    const snapshot = await this.snapshotRepository.save(
      this.snapshotRepository.create({
        sku: createSnapshot.sku,
        createdAt: createSnapshot.createdAt,
        listings,
      }),
    );

    await this.amqpConnection.publish('bptf-snapshot.created', '*', snapshot);

    return snapshot;
  }
}
