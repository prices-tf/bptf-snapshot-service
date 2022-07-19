import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SchemaService } from './schema.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SchemaService],
  exports: [SchemaService],
})
export class SchemaModule {}
