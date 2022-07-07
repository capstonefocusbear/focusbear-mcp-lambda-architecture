import { Inject, Injectable } from '@nestjs/common';
import * as axios from 'axios';
import { IRevenueCatOptions } from './interfaces';
import { REVENUE_CAT_MODULE_OPTIONS } from './revenue-cat.constants';

@Injectable()
export class RevenueCatService {
  constructor(@Inject(REVENUE_CAT_MODULE_OPTIONS) private options: IRevenueCatOptions) {}

  private httpService: axios.AxiosStatic = axios.default;

  async getOrCreateSubscriber(app_user_id: string): Promise<any> {
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}`;
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    return this.httpService.get(callUrl, { headers }).then(({ data }: axios.AxiosResponse<unknown, any>): any => data);
  }
}
