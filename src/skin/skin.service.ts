import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Services } from '../common/config/configuration';
import { Skin } from './interfaces/skin.interface';

@Injectable()
export class SkinService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getSkinByid(id: number): Promise<Skin> {
    const url = `${
      this.configService.get<Services>('services').skin
    }/skins/id/${id}`;

    return this.httpService
      .get<Skin>(url)
      .toPromise()
      .then((response) => {
        return response.data;
      });
  }
}
