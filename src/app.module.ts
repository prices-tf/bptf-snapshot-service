import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, {
  Config,
  DatabaseConfig,
  QueueConfig,
} from './common/config/configuration';
import { validation } from './common/config/validation';
import { Listing } from './listing/models/listing.entity';
import { Snapshot } from './listing/models/snapshot.entity';
import { ListingModule } from './listing/listing.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: process.env.NODE_ENV === 'test' ? '.test.env' : '.env',
      load: [configuration],
      validationSchema: validation,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseConfig = configService.get<DatabaseConfig>('database');

        return {
          type: 'postgres',
          host: databaseConfig.host,
          port: databaseConfig.port,
          username: databaseConfig.username,
          password: databaseConfig.password,
          database: databaseConfig.database,
          entities: [Snapshot, Listing],
          autoLoadModels: true,
          synchronize: process.env.TYPEORM_SYNCRONIZE === 'true',
          keepConnectionAlive: true,
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Config>) => {
        const queueConfig = configService.get<QueueConfig>('queue');

        return {
          redis: {
            host: queueConfig.host,
            port: queueConfig.port,
            password: queueConfig.password,
          },
          prefix: 'bull',
        };
      },
    }),
    ListingModule,
  ],
})
export class AppModule {}
