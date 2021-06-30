import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
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

  @ManyToMany(() => Listing, {
    cascade: true,
  })
  @JoinTable()
  listings: Listing[];

  @Column()
  readonly createdAt: Date;
}
