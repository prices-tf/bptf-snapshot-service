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
import Bull, { Queue } from 'bull';
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

@Injectable()
export class ListingService {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly skinService: SkinService,
    @InjectQueue('snapshot')
    private readonly queue: Queue<{
      sku: string;
    }>,
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
  ): Promise<boolean> {
    const jobId = sku;

    const job = await this.queue.getJob(jobId);

    if (job) {
      const state = await job.getState();

      if (
        replace === true &&
        state !== 'active' &&
        job.opts.priority !== priority
      ) {
        // Job has a different priority, replace it with new job
        await job.remove();
      } else if (replace === true && state === 'delayed') {
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

    if (priority !== undefined) {
      options.priority = priority;
    }

    await this.queue.add(
      {
        sku,
      },
      options,
    );

    // Added job to queue

    return true;
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
    const listings = createSnapshot.listings.map((listing) => {
      let id = '440_';

      if (listing.intent === ListingIntent.BUY) {
        id +=
          listing.steamid +
          '_' +
          createHash('md5').update(createSnapshot.name).digest('hex');
      } else {
        id += listing.item.id;
      }

      const sku = this.createSKUFromItem(listing.item);

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
        details: listing.details === '' ? null : listing.details,
        createdAt: new Date(listing.timestamp * 1000),
        bumpedAt: new Date(listing.bump * 1000),
      });
    });

    const snapshot = await this.dataSource.transaction(
      async (entityManager) => {
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

    let wearTier =
      wear === undefined
        ? null
        : Math.floor(parseFloat(wear.float_value.toString()) * 10) / 2;

    if (wearTier <= 0) {
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
      quality2:
        itemAttributes.findIndex((v) => v.defindex == 388) !== -1 ? 11 : null,
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
