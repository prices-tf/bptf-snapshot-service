import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.synchronize(true);
  });

  afterEach(async () => {
    const amqpConnection = app.get(AmqpConnection);
    await amqpConnection.managedConnection.close();
    return app.close();
  });

  describe('GET /listings', () => {
    it('should error when snapshot does not exist', () => {
      return request(app.getHttpServer()).get(`/listings/5021;6`).expect(404);
    });
  });
});
