import * as cheerio from 'cheerio';
import { EntryScraper } from '../models/entry-scraper.model';
import { IVehicleEntry } from '../interfaces/interfaces';
export class ASEntryScraper extends EntryScraper {
  serviceName = 'AutoScout EntryScraper';
  platformUrl = 'https://www.autoscout24.hu';
  queryUrl =
    '/lst/?sort=age&desc=1&offer=J%2CU%2CO%2CD&ustate=N%2CU&size=20&page=1&cy=A&atype=C&ac=0&';
  sleepTime = 2.5;

  async processData(data: string) {
    const $ = cheerio.load(data);
    const response: Omit<IVehicleEntry, 'id'>[] = [];
    $('.cldt-summary-full-item').each((i, element) => {
      const entryId = $(element).attr('id')!.split('-');
      const platformId = entryId.slice(1, entryId.length).join('-');
      const url = `/ajanlat/${
        $(element).find($('a')).attr('href')!.split('/')[2]
      }`;

      const vehicle = {
        platform: this.platformUrl,
        platformId,
        url,
      };

      response.unshift(vehicle);
    });

    return response;
  }
};
