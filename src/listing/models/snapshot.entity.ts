import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Listing } from './listing.entity';

@Entity()
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  @Index()
  @Column({
    unique: true,
  })
  readonly sku: string;

  @OneToMany(() => Listing, (listing) => listing.snapshot, {
    onDelete: 'CASCADE',
  })
  listings: Listing[];

  @Column()
  readonly createdAt: Date;
}
