import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SkinService } from './skin.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [SkinService],
  exports: [SkinService],
})
export class SkinModule {}
