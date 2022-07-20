import { Injectable } from '@nestjs/common';
import { Snapshot } from './models/snapshot.entity';
import { DataSource } from 'typeorm';
import {
  CreateSnapshotDto,
  ItemAttributeDto,
  ItemDto,
} from './dto/create-snapshot.dto';
import { Listing } from './models/listing.entity';
import { InjectQueue } from '@nestjs/bull';
import Bull, { Job, Queue } from 'bull';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';
import * as SKU from 'tf2-sku';
import { ListingIntent } from './enums/listing-intent.enum';
import { createHash } from 'crypto';
import { SchemaService } from '../schema/schema.service';
import { SkinService } from '../skin/skin.service';
import { Item } from './interfaces/item.interface';
import * as DataLoader from 'dataloader';
import { QueueData } from './interfaces/queue.interface';

type JobState = Bull.JobStatus | 'stuck';

@Injectable()
export class ListingService {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly skinService: SkinService,
    @InjectQueue('snapshot')
    private readonly queue: Queue<QueueData>,
    private readonly amqpConnection: AmqpConnection,
    private readonly dataSource: DataSource,
  ) {}

  isValidSKU(sku: string): boolean {
    const item = SKU.fromString(sku);

    if (item.craftnumber !== null) {
      return false;
    }

    return sku === SKU.fromObject(item);
  }

  async enqueueSnapshot(
    sku: string,
    delay?: number,
    priority?: number,
    replace = true,
  ): Promise<{
    enqueued: boolean;
    state: JobState;
  }> {
    const jobId = sku;

    const job = await this.queue.getJob(jobId);
    let state = job === null ? null : await job.getState();

    let notQueued = job === null;

    if (replace === true && job !== null) {
      // Job is already in the queue, so we need to check its state to determine
      // what we should do with it

      // This check is redundant, but it's here for safety
      if (state === 'completed' || state === 'failed') {
        await job.remove();
        notQueued = true;
      } else if (state !== 'active' && job.opts.priority !== priority) {
        // Job is not active and priorities are different, replace the job
        await job.remove();
        notQueued = true;
      } else if (state === 'delayed') {
        // Job is delayed, check if it should be promoted or replaced

        const now = new Date().getTime();

        // Time for when the job state will change to "waiting"
        const delayEnd = job.timestamp + job.opts.delay;

        if (delay === undefined || job.attemptsMade > 0) {
          // Job should not have a delay, or it has been retried, promote it to "waiting"
          await job.promote();
          state = 'waiting';
        } else if (delayEnd > now + delay) {
          // Job will become waiting later than now requested, replace it
          await job.remove();
          notQueued = true;
        }
      }
    }

    let enqueued = false;

    if (notQueued === true) {
      // Job is not in the queue, so we can add it
      const data: QueueData = {
        sku,
      };

      const options: Bull.JobOptions = {
        jobId,
        delay: delay ?? undefined,
        priority: priority ?? undefined,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      };

      // Add job to the queue
      await this.queue.add(data, options);

      enqueued = true;
      state = 'waiting';
    }

    return {
      enqueued,
      state,
    };
  }

  getListingsBySKU(sku: string): Promise<Snapshot> {
    return this.dataSource.createEntityManager().findOne(Snapshot, {
      where: {
        sku,
      },
      relations: ['listings'],
    });
  }

  paginate(
    options: IPaginationOptions,
    order: 'ASC' | 'DESC',
  ): Promise<Pagination<Snapshot>> {
    return paginate<Snapshot>(
      this.dataSource.getRepository(Snapshot),
      options,
      {
        order: {
          createdAt: order,
        },
      },
    );
  }

  async saveSnapshot(createSnapshot: CreateSnapshotDto): Promise<Snapshot> {
    const nameLoader = new DataLoader<string, string>(
      (keys) => this.createName(keys[0]).then((name) => [name]),
      {
        batch: false,
      },
    );

    const listings = await Promise.all(
      createSnapshot.listings.map(async (listing) => {
        const sku = this.createSKUFromItem(listing.item);

        const name = await nameLoader.load(sku);

        let id = '440_';

        if (listing.intent === ListingIntent.BUY) {
          id +=
            listing.steamid +
            '_' +
            createHash('md5').update(name).digest('hex');
        } else {
          id += listing.item.id;
        }

        return this.dataSource.getRepository(Listing).create({
          id,
          sku,
          steamid64: listing.steamid,
          item: listing.item,
          intent: listing.intent,
          currenciesKeys: listing.currencies.keys ?? 0,
          currenciesHalfScrap:
            listing.currencies.metal === undefined
              ? 0
              : Math.round(listing.currencies.metal * 9 * 2),
          isAutomatic: listing.userAgent !== undefined,
          isOffers: listing.offers === 1,
          isBuyout: listing.buyout === 1,
          comment: listing.details === '' ? null : listing.details,
          createdAt: new Date(listing.timestamp * 1000),
          bumpedAt: new Date(listing.bump * 1000),
        });
      }),
    );

    const snapshot = await this.dataSource.transaction(
      async (entityManager) => {
        await entityManager
          .createQueryBuilder()
          .delete()
          .from(Listing)
          .where('"snapshotSku" = :sku')
          .setParameter('sku', createSnapshot.sku)
          .execute();

        await entityManager.delete(Snapshot, { sku: createSnapshot.sku });

        await entityManager.save(Listing, listings);

        const snapshot = await entityManager.save(
          Snapshot,
          entityManager.create(Snapshot, {
            sku: createSnapshot.sku,
            name: createSnapshot.name,
            createdAt: new Date(createSnapshot.createdAt * 1000),
            listings,
          }),
        );

        return snapshot;
      },
    );

    await this.amqpConnection.publish('bptf-snapshot.created', '*', snapshot);

    return snapshot;
  }

  private createSKUFromItem(item: ItemDto): string {
    const itemAttributes = item.attributes ?? [];

    const killstreak = itemAttributes.find((v) => v.defindex == 2025);
    const effect = itemAttributes.find((v) => v.defindex == 134);
    const tauntEffect = itemAttributes.find((v) => v.defindex == 2041);
    const wear = itemAttributes.find((v) => v.defindex == 725);
    const paintkit = itemAttributes.find((v) => v.defindex == 834);
    const createSeries = itemAttributes.find((v) => v.defindex == 187);
    const output = itemAttributes.find(
      (v) => v.is_output?.toString() === 'true',
    );
    const festivized = itemAttributes.find((v) => v.defindex == 2053);
    const hasKillEater =
      itemAttributes.findIndex((v) => v.defindex == 214) !== -1;

    let wearTier =
      wear === undefined
        ? null
        : Math.floor(parseFloat(wear.float_value.toString()) * 10) / 2;

    if (wearTier !== null && wearTier <= 0) {
      wearTier = 1;
    }

    const object = {
      defindex: item.defindex,
      quality: item.quality,
      craftable: item.flag_cannot_craft !== true,
      killstreak:
        killstreak === undefined
          ? 0
          : parseInt(killstreak.float_value.toString(), 10),
      australium: itemAttributes.findIndex((v) => v.defindex == 2027) !== -1,
      festive: festivized === undefined ? false : festivized.float_value != 0,
      effect: null,
      paintkit:
        paintkit === undefined ? null : parseInt(paintkit.value.toString(), 10),
      wear: wearTier,
      quality2: null,
      target: null,
      crateseries:
        createSeries === undefined
          ? null
          : parseInt(createSeries.float_value.toString(), 10),
      output: null,
      outputQuality: null,
    };

    if (effect !== undefined) {
      object.effect = parseInt(effect.float_value.toString(), 10);
    } else if (tauntEffect !== undefined) {
      object.effect = parseInt(tauntEffect.value.toString(), 10);
    }

    let target: ItemAttributeDto = undefined;

    if (output) {
      object.output = output.itemdef;
      object.outputQuality = output.quality;

      if (output.attributes) {
        target = output.attributes.find((v) => v.defindex == 2012);
      }
    } else {
      target = itemAttributes.find((v) => v.defindex == 2012);
    }

    if (target !== undefined) {
      object.target = parseInt(target.float_value.toString(), 10);
    }

    if (item.defindex === 20003) {
      object.killstreak = 3;
    } else if (item.defindex === 20002) {
      object.killstreak = 2;
    }

    if (hasKillEater && object.quality !== 11) {
      object.quality2 = 11;
    }

    return SKU.fromObject(object);
  }

  async createName(sku: string): Promise<string> {
    const item: Item = SKU.fromString(sku);
    const schemaItem = await this.schemaService.getItemByDefindex(
      item.defindex,
    );

    let name = '';

    if (item.craftable === false) {
      name += 'Non-Craftable ';
    }

    if (item.outputQuality && item.outputQuality !== 6) {
      name =
        (await this.schemaService.getQualityById(item.outputQuality)).name +
        ' ';
    }

    if (item.quality2) {
      name +=
        (await this.schemaService.getQualityById(item.quality2)).name + ' ';
    }

    if (
      (item.quality !== 6 && item.quality !== 15 && item.quality !== 5) ||
      (item.quality === 5 && !item.effect) ||
      schemaItem.item_quality === 5
    ) {
      name +=
        (await this.schemaService.getQualityById(item.quality)).name + ' ';
    }

    if (item.festive === true) {
      name += 'Festivized ';
    }

    if (item.effect) {
      name += (await this.schemaService.getEffectById(item.effect)).name + ' ';
    }

    if (item.killstreak && item.killstreak > 0) {
      name +=
        ['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'][
          item.killstreak - 1
        ] + ' ';
    }

    if (item.target) {
      name +=
        (await this.schemaService.getItemByDefindex(item.target)).item_name +
        ' ';
    }

    if (item.output) {
      name +=
        (await this.schemaService.getItemByDefindex(item.output)).item_name +
        ' ';
    }

    if (item.australium === true) {
      name += 'Australium ';
    }

    if (item.paintkit !== null) {
      name += (await this.skinService.getSkinByid(item.paintkit)).name + ' ';
    }

    if (name === '' && schemaItem.proper_name == true) {
      name = 'The ';
    }

    name += schemaItem.item_name;

    if (item.wear) {
      name +=
        ' (' +
        [
          'Factory New',
          'Minimal Wear',
          'Field-Tested',
          'Well-Worn',
          'Battle Scarred',
        ][item.wear - 1] +
        ')';
    }

    if (item.crateseries) {
      name += ' #' + item.crateseries;
    }

    return name;
  }
}
