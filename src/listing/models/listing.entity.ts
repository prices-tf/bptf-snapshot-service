import { ListingIntent } from '../enums/listing-intent.enum';
import { Column, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm';
import { Snapshot } from './snapshot.entity';

@Entity()
export class Listing {
  @PrimaryColumn()
  readonly id: string;

  @Column()
  readonly sku: string;

  @Column()
  readonly steamid64: string;

  @Column({
    type: 'jsonb',
  })
  readonly item: any;

  @Column({
    type: 'enum',
    enum: ListingIntent,
  })
  readonly intent: ListingIntent;

  @Column()
  readonly isAutomatic: boolean;

  @Column()
  readonly isBuyout: boolean;

  @Column()
  readonly isOffers: boolean;

  @Column({
    nullable: true,
  })
  readonly comment: string;

  @Column({
    type: 'float',
  })
  readonly currenciesKeys: number;

  @Column({
    type: 'int',
  })
  readonly currenciesHalfScrap: number;

  @Column()
  readonly createdAt: Date;

  @Column()
  readonly bumpedAt: Date;

  @Index()
  @ManyToOne(() => Snapshot, (snapshot) => snapshot.listings)
  snapshot: Snapshot;
}
