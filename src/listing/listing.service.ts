import { Injectable } from '@nestjs/common';
import { Snapshot } from './models/snapshot.entity';
import { getConnection, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { Listing } from './models/listing.entity';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
  ) {}

  getListingsBySKU(sku: string): Promise<Snapshot> {
    return this.snapshotRepository.findOne({
      where: {
        sku: sku,
      },
      relations: ['listings'],
    });
  }

  async saveSnapshot(createSnapshot: CreateSnapshotDto): Promise<Snapshot> {
    // const snapshot = this.snapshotRepository.create(createSnapshot);

    return getConnection().transaction(async (transactionalEntityManager) => {
      const currentSnapshots = await transactionalEntityManager.find(Snapshot, {
        where: {
          sku: createSnapshot.sku,
        },
      });

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
            createdAt: listing.createdAt,
            bumpedAt: listing.bumpedAt,
            snapshot,
          })),
        ),
      );

      snapshot.listings = listings;

      return snapshot;
    });
  }
}
